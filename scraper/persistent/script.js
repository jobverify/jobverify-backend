import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { setTimeout as waitForRequestSlot } from 'node:timers/promises'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { readNativeDocument, extractActiveDescription } from '../../scraper-support/utils/activeNativeHtml.js'
import { readVisibleNativeDocument } from '../../scraper-support/utils/visibleNativeHtml.js'

const OFFICIAL_URL = 'https://www.persistent.com/careers/'
const CAREERS_URL = 'https://careers.persistent.com'
const API_URL = 'https://public.zwayam.com'
const SEARCH_URL = `${API_URL}/jobs/search`
const DETAIL_URL = `${API_URL}/jobs-service/v1/jobs/careersite`
const DOMAIN = 'careers.persistent.com'
const DEFAULT_COMPANY_ID = 'MTYzNDQ='
const sha = value => createHash('sha256').update(value).digest('hex')
const norm = value => String(value ?? '').replace(/\s+/g, ' ').trim() || null
const decode = value => String(value ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/gi, ' ').replace(/&quot;/gi, '"').replace(/&apos;|&#39;|&rsquo;/gi, "'")
  .replace(/&ldquo;|&rdquo;/gi, '"').replace(/&ndash;|&mdash;/gi, '-').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
const plain = value => {
  if (value == null) return null
  const document = readVisibleNativeDocument(String(value))
  const root = document.nodes(node => node.tag === 'root')[0]
  return root ? norm(decode(document.text(root))) : null
}
const csv = value => (norm(value)?.split(',').map(norm).filter(Boolean) || [])
const experience = value => norm(value)?.replace(/\s+to\s+/i, '-') || null
const validDate = (value, { allowFuture = false } = {}) => {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  if (!norm(value)) return null
  let date, result
  if (typeof value === 'string') {
    const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value)
    const named = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec(value)
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const year = iso ? Number(iso[1]) : named ? Number(named[3]) : NaN
    const month = iso ? Number(iso[2]) - 1 : named ? months.indexOf(named[2].toLowerCase()) : NaN
    const day = iso ? Number(iso[3]) : named ? Number(named[1]) : NaN
    if (month < 0 || month > 11) return null
    date = new Date(Date.UTC(year, month, day))
    if (!Number.isFinite(+date) || date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) return null
    if (iso && !Number.isFinite(+new Date(value))) return null
    result = date.toISOString().slice(0, 10)
  } else {
    date = new Date(value)
    if (!Number.isFinite(+date)) return null
    result = date.toISOString().slice(0, 10)
  }
  return +date > 0 && (allowFuture || result <= new Date().toISOString().slice(0, 10)) ? result : null
}
const abort = signal => signal?.throwIfAborted()
const contractError = message => new Error(`Persistent native contract: ${message}`)
const publicFailureStatus = error => {
  const status = Number(error?.status || /HTTP (\d{3})/.exec(String(error?.message))?.[1])
  return [401, 403, 429].includes(status) || status >= 500 ? status : null
}

// Native country labels are accepted only through recognized region mappings.
const countryNames = new Map(), regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), name = regionNames.of(code)
  if (name && name !== code && !['ZZ', 'EU', 'UN', 'XA', 'XB', 'QO'].includes(code)) {
    countryNames.set(code.toLowerCase(), code)
    countryNames.set(name.toLowerCase(), code)
  }
}
for (const [name, code] of Object.entries({ IND: 'IN', USA: 'US', 'United States of America': 'US', UK: 'GB', GBR: 'GB', UAE: 'AE' })) countryNames.set(name.toLowerCase(), code)
const countryCode = value => typeof value === 'string' ? countryNames.get(value.trim().toLowerCase()) || null : null

// text1 is explicitly configured as the public Location/country facet. Detailed
// native countries are retained too, and conflicts cannot silently become India.
export const classifyPersistentCountry = (record = {}) => {
  const facet = norm(record.text1)
  const locations = Array.isArray(record.jobLocationRecord) ? record.jobLocationRecord : []
  const countries = [...new Set(locations.map(v => norm(v?.country)).filter(Boolean))]
  const unknownLocation = locations.some(v => !norm(v?.country))
  const explicit = countries.length ? countries : facet ? [facet] : []
  const facetCode = countryCode(facet), locationCodes = countries.map(countryCode)
  const explicitCodes = explicit.map(countryCode)
  const unknownCountry = explicitCodes.some(code => !code) || Boolean(facet && !facetCode)
  const conflict = Boolean(facetCode && countries.length && !locationCodes.includes(facetCode))
  return { india: !conflict && !unknownCountry && explicitCodes.includes('IN'),
    known: explicit.length > 0 && !unknownCountry && !unknownLocation && !conflict, countries: explicit,
    countryCodes: explicitCodes, facetCountry: facet, facetCountryCode: facetCode, locationCountries: countries, conflict }
}

export const buildSearchPayload = ({ page = 1, offset = null, keywords = '', companyId = DEFAULT_COMPANY_ID } = {}) => ({
  filterCri: JSON.stringify({ paginationStartNo: Number.isInteger(offset) ? Math.max(0, offset) : (Math.max(1, Number(page) || 1) - 1) * 9,
    selectedCall: 'sort', sortCriteria: { name: 'modifiedDate', isAscending: false }, anyOfTheseWords: norm(keywords) || '' }),
  domain: DOMAIN, companyId,
})
export const buildJobDetailUrl = (jobUrl, id) => `${CAREERS_URL}/jobview/${encodeURIComponent(norm(jobUrl) || '')}${id == null ? '' : `?id=${encodeURIComponent(id)}`}`
const sourceRows = payload => {
  if (!Array.isArray(payload?.data?.data)) throw contractError('missing native listing array')
  return payload.data.data.map(item => item?._source || item)
}
const listingJob = record => ({
  title: norm(record.jobTitle), company: 'Persistent Systems', department: norm(record.departmentName || record.DepartmentName),
  location: norm(record.locationDisplayForManageJobs || record.location || record.locAgg),
  city: norm(record.jobLocationRecord?.[0]?.city), country: 'India',
  jobId: norm(record.jobCode), nativePostingId: norm(record.id), nativeReferenceNumber: norm(record.referenceNumber || record.refNumber),
  requisitionId: null, sourceUrl: buildJobDetailUrl(record.jobUrl, record.id), applyUrl: buildJobDetailUrl(record.jobUrl, record.id),
  nativeJobUrl: norm(record.jobUrl), employmentType: null, experienceRequired: experience(record.experienceUIField),
  minimumQualification: null, preferredQualification: null, requiredSkills: record.mandatorySkills || [],
  postingDate: null, closingDate: null, sourceNativeListingEndDate: record.endtDate ?? null, jobDescription: null, sourceCountryEvidence: classifyPersistentCountry(record),
})
export const extractSearchResults = payload => sourceRows(payload).filter(r => { const country = classifyPersistentCountry(r); return country.india && country.known }).map(listingJob)
export const extractPaginationSummary = (payload, { currentOffset = 0 } = {}) => {
  const data = payload?.data
  if (!Number.isInteger(data?.totalCount) || data.totalCount < 0) throw contractError('missing valid native total count')
  if (typeof data.hasMoreData !== 'boolean') throw contractError('missing boolean pagination terminal marker')
  const pageSize = Number(data.facetedSearchConfig?.paginationHowMuch)
  if (!Number.isInteger(pageSize) || pageSize < 1) throw contractError('missing positive native page size')
  return { hasNext: data.hasMoreData, pageSize, nextOffset: currentOffset + pageSize, totalCount: data.totalCount }
}

const nativeExpiry = (payload, listing, reqFields) => {
  const fields = payload?.jobConfigurationData || {}
  const values = [
    ['jobConfigurationData.Closing Date', fields['Closing Date']],
    ['jobConfigurationData.ClosingDate', fields.ClosingDate],
    ['visibleRequisition.Closing Date', reqFields['Closing Date']],
    ['detail.endtDate', payload?.endtDate],
    ['listing.endtDate', listing.sourceNativeListingEndDate],
  ].filter(([, value]) => value != null && value !== '')
  const evidence = values.map(([field, raw]) => {
    const value = typeof raw === 'number' ? raw : plain(raw)
    const date = validDate(value, { allowFuture: true })
    const exact = typeof value === 'number' || /T/.test(value || '')
    const expiresAt = date ? (exact ? +new Date(value) : +new Date(`${date}T23:59:59.999Z`)) : null
    return { field, raw, date, expiresAt }
  })
  const dates = [...new Set(evidence.map(item => item.date).filter(Boolean))].sort()
  return { closingDate: dates[0] || null, evidence,
    expired: evidence.some(item => Number.isFinite(item.expiresAt) && item.expiresAt <= Date.now()),
    unresolved: evidence.some(item => !item.date || !Number.isFinite(item.expiresAt)) || dates.length > 1 }
}

export const extractJobDetail = (payload, listing = {}, reqFields = {}) => {
  const fields = payload?.jobConfigurationData || {}
  const description = extractActiveDescription(fields.Description) ? plain(fields.Description) : null
  const extra = Object.entries(reqFields).map(([key, value]) => `${key}: ${plain(value) || ''}`).join('\n')
  const modifiedDateConfigured = payload?.isModifiedDateConfiguredForCareerSiteView === true || payload?.modifiedDateConfiguredForCareerSiteView === true
  const postingDate = modifiedDateConfigured ? null : validDate(fields['Posted On'])
  const sourceUrl = listing.sourceUrl || buildJobDetailUrl(payload?.jobUrl, payload?.id)
  const allFields = { ...fields, ...reqFields }
  const expiry = nativeExpiry(payload, listing, reqFields)
  const employmentType = norm(/Job Type:\s*([^\n<]+)/i.exec(String(fields.Description || ''))?.[1])
  return { ...listing, title: norm(payload?.jobTitle), department: norm(payload?.department?.departmentName || payload?.departmentName),
    jobId: norm(payload?.jobCode), nativePostingId: norm(payload?.id), nativeReferenceNumber: norm(payload?.referenceNumber),
    requisitionId: plain(reqFields['Requisition ID']) || null,
    location: plain(fields.Location) || norm(payload?.locationDisplayForManageJobs || payload?.location), city: listing.city || null,
    sourceUrl, applyUrl: sourceUrl, employmentType,
    experienceRequired: experience(fields['Years Of Exp']), requiredSkills: csv(plain(fields['Skills Required'])),
    minimumQualification: plain(allFields['Minimum Qualification']) || null,
    preferredQualification: plain(allFields['Preferred Qualification']) || null,
    postingDate, closingDate: expiry.closingDate,
    sourceNativeExpiryEvidence: expiry.evidence, sourceNativeExpired: expiry.expired, sourceNativeExpiryUnresolved: expiry.unresolved,
    jobDescription: description ? [description, extra].filter(Boolean).join('\n') : null,
    jobDescriptionHtml: fields.Description || null,
    sourceNativeDetailAttributes: Object.fromEntries(Object.entries(fields).filter(([key]) => key !== 'Description')),
    sourceNativeRequisitionAttributes: reqFields,
    sourceDetailComplete: Boolean(description && description.length >= 100 && description === plain(payload?.longDescription)),
    sourcePublicationDateComplete: Boolean(postingDate), sourcePublicationDateUnavailable: !postingDate,
    sourcePublicationDateField: postingDate ? 'jobConfigurationData.Posted On' : null,
    sourcePublicationDateReason: modifiedDateConfigured ? 'native-view-configured-to-modification-date' : postingDate ? null : 'native-original-publication-date-not-exposed',
    sourceNativeDocumentCreatedDate: payload?.createdDate ?? null,
    sourceNativeDocumentCreateDateLabel: payload?.createDate ?? null,
    sourceNativeStatus: payload?.status ?? null,
    sourceNativeDisplayedLocation: plain(fields.Location),
    sourceNativeDescriptionSha256: sha(String(fields.Description || '')),
    publicExperienceChecked: true,
  }
}

const request = async (url, options = {}) => {
  const signal = options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(45000)]) : AbortSignal.timeout(45000)
  const response = await fetch(url, { ...options, signal })
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`)
    error.status = response.status
    if (response.status >= 500) { error.softFailure = true; error.upstreamOutage = true }
    throw error
  }
  return response
}
const fetchText = async (url, options) => { const r = await request(url, options); return { text: await r.text(), finalUrl: r.url } }
const fetchJson = async (url, options) => (await request(url, options)).json()
const document = (response, url) => typeof response === 'string' ? { text: response, finalUrl: url } : response
const headers = { Accept: 'application/json,text/plain,*/*', 'User-Agent': 'Mozilla/5.0' }

const recruitingHost = /(?:^|\.)(?:myworkdayjobs\.com|myworkdaysite\.com|greenhouse\.io|lever\.co|ashbyhq\.com|smartrecruiters\.com|icims\.com|taleo\.net|oraclecloud\.com|workable\.com|zohorecruit\.(?:com|in)|successfactors\.(?:com|eu)|bamboohr\.com|applytojob\.com|jobvite\.com|recruitee\.com|teamtailor\.com|freshteam\.com|careers-page\.com|darwinbox\.(?:com|in)|avature\.net|dayforcehcm\.com)$/i
const recruitingLabel = /\b(?:careers?|jobs?|openings?|opportunities|hiring|recruit(?:ment|ing)?|workday|greenhouse|ashby|lever)\b/i
const literalUrls = value => [...String(value || '').replaceAll('\\/', '/').matchAll(/https?:\/\/[^\s"'<>`\\)]+/g)].map(match => match[0])
const additionalNativeScopes = (html, baseUrl, clientText = '') => {
  // The active tree excludes templates, inert ancestors, hidden attributes and
  // raw iframe fallback. CSS-only ambiguity remains conservative scope evidence.
  const document = readNativeDocument(html), scopes = []
  const add = (kind, value, label = '') => {
    let url
    try { url = new URL(value, baseUrl) } catch { return }
    if (!['https:', 'http:'].includes(url.protocol)) return
    const boundOrigin = url.origin === CAREERS_URL || url.origin === API_URL
    const knownOfficial = url.origin === 'https://www.persistent.com' && /^\/careers\/?$/.test(url.pathname)
    const boundRoute = boundOrigin && (/^\/(?:explore-opportunities\/?|jobview\/[^/]+)?$/.test(url.pathname) || kind === 'script')
    if (kind === 'iframe' || recruitingHost.test(url.hostname)
      || (!knownOfficial && !boundRoute && recruitingLabel.test(`${url.pathname} ${label}`))) scopes.push({ kind, url: url.href })
  }
  for (const node of document.nodes(node => node.tag === 'a' && Boolean(node.attrs.href))) add('anchor', node.attrs.href, document.text(node))
  for (const node of document.nodes(node => node.tag === 'script')) {
    if (node.attrs.src) add('script', node.attrs.src)
    else for (const url of literalUrls(node.raw)) if (recruitingHost.test(new URL(url).hostname)) add('inline-script', url)
  }
  const frames = node => {
    if (node.activeFrame) {
      if (Object.hasOwn(node.attrs, 'srcdoc') || !norm(node.attrs.src)) scopes.push({ kind: 'iframe', url: null, reason: 'opaque-active-frame-scope' })
      else add('iframe', node.attrs.src)
      return
    }
    if (node.inert) return
    for (const child of node.children || []) if (typeof child !== 'string') frames(child)
  }
  const root = document.nodes(node => node.tag === 'root')[0]
  if (root) frames(root)
  for (const url of literalUrls(clientText)) if (recruitingHost.test(new URL(url).hostname)) add('client-script', url)
  return [...new Map(scopes.map(scope => [JSON.stringify(scope), scope])).values()]
}

export const verifyPersistentBinding = async ({ fetchTextImpl, fetchJsonImpl, signal }) => {
  abort(signal)
  const official = document(await fetchTextImpl(OFFICIAL_URL, { signal }), OFFICIAL_URL)
  const officialFinal = new URL(official.finalUrl)
  if (officialFinal.hostname !== DOMAIN && !(officialFinal.hostname === 'www.persistent.com' && /href=["']https:\/\/careers\.persistent\.com(?:\/|["'])/i.test(official.text))) throw contractError('official employer handoff missing')
  const shell = officialFinal.hostname === DOMAIN ? official : document(await fetchTextImpl(`${CAREERS_URL}/explore-opportunities`, { signal }), CAREERS_URL)
  if (!/Careers at Persistent\s*\|\s*Persistent Systems/i.test(shell.text)) throw contractError('native shell employer identity missing')
  const mainSrc = /<script\b[^>]*\bsrc=["']([^"']*\bmain\.[a-f0-9]+\.js)["'][^>]*>/i.exec(shell.text)?.[1]
  if (!mainSrc) throw contractError('native main client missing')
  const mainUrl = new URL(mainSrc, shell.finalUrl).href
  if (new URL(mainUrl).origin !== CAREERS_URL) throw contractError('untrusted native client origin')
  const client = document(await fetchTextImpl(mainUrl, { signal }), mainUrl)
  if (new URL(client.finalUrl).origin !== CAREERS_URL) throw contractError('native client redirected outside employer')
  const matches = [...client.text.matchAll(/\{COMPANYID:"([A-Za-z0-9+/=]+)",COMPANYURL:"([A-Za-z0-9+/=]+)",DOMAIN:"([^"]+)",APIENDPOINT:"([^"]+)",APIENDPOINTNEW:"([^"]+)",JOBSHAREURL:"([^"]+)"\}/g)]
  if (matches.length !== 1) throw contractError('ambiguous or missing native account binding')
  const [, encodedCompanyId, companyUrl, domain, api, apiNew] = matches[0]
  const companyId = Buffer.from(encodedCompanyId, 'base64').toString('utf8')
  if (!/^\d+$/.test(companyId) || domain !== DOMAIN || api !== `${API_URL}/` || apiNew !== `${API_URL}/`
    || !Buffer.from(companyUrl, 'base64').toString('utf8').startsWith(`${DOMAIN}/`)
    || !client.text.includes('v1:"jobs/search"') || !client.text.includes('getJobData:"jobs-service/v1/jobs/careersite"')
    || !client.text.includes('getReqFieldsForCareersSite:"requisition_service/getReqFieldsForCareersSite"')
    || !client.text.includes('jobData.jobConfigurationData["Posted On"]')) throw contractError('untrusted endpoint or unsupported native contract binding')
  const config = await fetchJsonImpl(`${API_URL}/data-service/v2/company/${companyId}/careersite-configurations`, { signal, headers })
  const company = config?.reponseObject?.company
  if (config.responseStatus !== 'SUCCESS' || String(company?.id) !== companyId || company?.companyName !== 'Persistent Systems'
    || company.domainName !== DOMAIN || company.careerSiteUrl !== DOMAIN || new URL(company.website).hostname !== 'www.persistent.com') throw contractError('current company configuration employer identity mismatch')
  return { companyId, encodedCompanyId, domain, companyName: company.companyName, officialUrl: OFFICIAL_URL,
    officialFinalUrl: official.finalUrl, mainUrl, additionalScopes: [...new Map([...additionalNativeScopes(official.text, official.finalUrl), ...additionalNativeScopes(shell.text, shell.finalUrl, client.text)].map(scope => [JSON.stringify(scope), scope])).values()], clientSha256: sha(client.text), configurationSha256: sha(JSON.stringify(config)), nativeShellSha256: sha(shell.text) }
}

const nativeSnapshot = row => ({ id: row.id, jobCode: row.jobCode, companyId: row.companyId, jobUrl: row.jobUrl,
  jobTitle: row.jobTitle, referenceNumber: row.referenceNumber, text1: row.text1, jobLocationRecord: row.jobLocationRecord,
  status: row.status, displayStatus: row.displayStatus, location: row.location, modifiedDate: row.modifiedDate, startDate: row.startDate, endtDate: row.endtDate })
const manifest = rows => rows.map(nativeSnapshot).sort((a, b) => String(a.id).localeCompare(String(b.id)))
const formData = payload => { const f = new FormData(); for (const [key, value] of Object.entries(payload)) f.append(key, value); return f }
const readInventory = async ({ binding, fetchJsonImpl, signal }) => {
  const rows = [], seen = new Set(), reasons = []
  let offset = 0, pages = 0, reportedTotal = null, indiaFacetCount = null, pageSize = null, publicFailure = null
  while (true) {
    abort(signal)
    let payload
    try {
      payload = await fetchJsonImpl(SEARCH_URL, { method: 'POST', headers, body: formData(buildSearchPayload({ offset, companyId: binding.encodedCompanyId })), signal })
    } catch (error) {
      abort(signal)
      publicFailure = publicFailureStatus(error)
      reasons.push(`native-listing-request-unavailable:${String(error.message).slice(0, 160)}`)
      break
    }
    const pageRows = sourceRows(payload), summary = extractPaginationSummary(payload, { currentOffset: offset })
    pages++
    const config = payload.data.facetedSearchConfig
    if (String(config.companyId) !== binding.companyId || config.domain !== DOMAIN || config.facetsMapping?.Location !== 'text1') throw contractError('listing response account/country configuration mismatch')
    if (reportedTotal !== null && reportedTotal !== summary.totalCount) reasons.push('native-total-changed-during-pagination')
    reportedTotal ??= summary.totalCount
    pageSize ??= summary.pageSize
    const countryFacet = payload.data.facets?.Location
    const completeCountryFacet = Array.isArray(countryFacet) && countryFacet.every(f => Number.isInteger(f.doc_count) && f.doc_count >= 0)
      && countryFacet.reduce((total, f) => total + f.doc_count, 0) === summary.totalCount
    const count = countryFacet?.find(f => f.key === 'India')?.doc_count ?? (completeCountryFacet ? 0 : null)
    if (!Number.isInteger(count) || count < 0) { if (summary.totalCount > 0) reasons.push('native-india-country-facet-count-missing') }
    else if (indiaFacetCount !== null && indiaFacetCount !== count) reasons.push('native-india-facet-changed-during-pagination')
    else indiaFacetCount = count
    let additions = 0
    for (const record of pageRows) {
      if (!record || String(record.companyId) !== binding.companyId || !Number.isInteger(record.id) || !norm(record.jobCode) || !/^[a-zA-Z0-9._~-]+$/.test(record.jobUrl || '')) { reasons.push('native-listing-identity-fields-missing-or-invalid'); continue }
      if (seen.has(record.id)) { reasons.push('native-listing-id-repeated'); continue }
      seen.add(record.id); additions++; rows.push(record)
    }
    if (!summary.hasNext) break
    if (!additions || pageRows.length !== summary.pageSize || rows.length >= summary.totalCount) { reasons.push('native-pagination-did-not-reconcile'); break }
    offset = summary.nextOffset
  }
  if (rows.length !== reportedTotal) reasons.push('native-total-distinct-id-count-mismatch')
  const actualIndia = rows.filter(r => classifyPersistentCountry(r).india).length
  if (indiaFacetCount !== null && indiaFacetCount !== actualIndia) reasons.push('native-india-facet-distinct-count-mismatch')
  return { rows, reasons, reportedTotal, indiaFacetCount, pages, pageSize, publicFailure }
}
const matchesDetail = (detail, listing, binding) => String(detail?.id) === String(listing.id)
  && String(detail?.jobCode) === String(listing.jobCode) && String(detail?.companyId) === binding.companyId
  && detail?.jobUrl === listing.jobUrl && norm(detail?.jobTitle) === norm(listing.jobTitle)
  && norm(detail?.referenceNumber) === norm(listing.referenceNumber)
  && norm(detail?.locationDisplayForManageJobs || detail?.location) === norm(listing.locationDisplayForManageJobs || listing.location)

const matchesNativeGeography = (detail, record) => {
  const typed = classifyPersistentCountry(record)
  if (!typed.known) return false
  const fields = detail?.jobConfigurationData || {}
  const nativeLocation = norm(detail.locationDisplayForManageJobs || detail.location)
  const displayed = Object.hasOwn(fields, 'Location') ? plain(fields.Location) : nativeLocation
  if (!displayed || displayed.toLowerCase() !== nativeLocation?.toLowerCase()) return false
  const displayedCountries = displayed.split(/[;|/]/).map(location => countryCode(location.split(',').at(-1))).filter(Boolean)
  return displayedCountries.every(code => typed.countryCodes.includes(code))
}

export const createPersistentScraper = ({ fetchJsonImpl = fetchJson, fetchTextImpl = fetchText, maxJobs = null, maxPages = null, requestIntervalMs = 1000 } = {}) => ({
  async run(options = {}) {
    const signal = options.signal
    abort(signal)
    // A single worker and shared request spacing avoid burst traffic. No public
    // numerical rate limit is claimed, and denials never trigger retries.
    const interval = options.requestIntervalMs ?? requestIntervalMs
    let nextRequestAt = 0
    const pacedFetchJson = async (url, requestOptions = {}) => {
      const delay = Math.max(0, nextRequestAt - Date.now())
      if (delay) await waitForRequestSlot(delay, undefined, { signal })
      abort(signal)
      nextRequestAt = Date.now() + (Number.isFinite(interval) && interval >= 0 ? interval : 1000)
      return fetchJsonImpl(url, requestOptions)
    }
    const binding = await verifyPersistentBinding({ fetchTextImpl, fetchJsonImpl: pacedFetchJson, signal })
    const initial = await readInventory({ binding, fetchJsonImpl: pacedFetchJson, signal })
    const reasons = [...initial.reasons], retained = []
    if (binding.additionalScopes.length) reasons.push('additional-employer-recruiting-scope-unaccounted')
    let publicFailure = initial.publicFailure
    let detailsFetched = 0, detailBodiesFetched = 0, requisitionBodiesFetched = 0, completeDetails = 0, failedDetails = 0
    const unknownCountries = initial.rows.filter(r => !classifyPersistentCountry(r).known).length
    const nonIndia = initial.rows.filter(r => !classifyPersistentCountry(r).india).length
    if (unknownCountries) reasons.push('native-country-authority-unknown-or-conflicting')
    // Sequential anonymous native detail/requisition reads; no profile endpoints.
    for (let index = 0; index < initial.rows.length && !publicFailure; index++) {
      const record = initial.rows[index], country = classifyPersistentCountry(record)
      abort(signal)
      try {
        detailsFetched++
        const payload = await pacedFetchJson(DETAIL_URL, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, signal,
          body: JSON.stringify({ jobUrl: record.jobUrl, externalSource: 'CareerSite', campusUrl: 'empty', companyId: binding.companyId, jobId: record.id }) })
        detailBodiesFetched++
        if (!matchesDetail(payload, record, binding) || payload.status !== 1 || record.status !== 1 || record.displayStatus !== 'Open') throw contractError(`listing-detail-identity-or-status-mismatch:${record.id}`)
        if (!matchesNativeGeography(payload, record)) throw contractError(`displayed-native-geography-or-location-mismatch:${record.id}`)
        if (norm(payload.careersiteRedirectionUrl)) throw contractError(`unresolved-native-detail-redirection:${record.id}`)
        const req = await pacedFetchJson(`${API_URL}/requisition_service/getReqFieldsForCareersSite/${record.id}/${binding.companyId}`, { signal, headers })
        requisitionBodiesFetched++
        const extra = req?.reponseObject?.customDetails
        if (req.responseStatus !== 'SUCCESS' || !extra || typeof extra !== 'object' || Array.isArray(extra)
          || Object.values(extra).some(value => value != null && !['string', 'number', 'boolean'].includes(typeof value))) throw contractError(`native-requisition-fields-missing:${record.id}`)
        const listing = listingJob(record), detail = extractJobDetail(payload, listing, extra)
        if (detail.sourceNativeExpired || detail.sourceNativeExpiryUnresolved) throw contractError(`native-expiry-expired-or-unresolved:${record.id}`)
        if (!detail.sourceDetailComplete) throw contractError(`full-visible-description-missing:${record.id}`)
        completeDetails++
        if (country.india && country.known) retained.push({ index, ...detail, source: 'persistent', link: detail.sourceUrl,
          sourceNativeListing: nativeSnapshot(record), sourceNativeBinding: binding, scrapedAt: new Date().toISOString() })
      } catch (error) {
        abort(signal)
        failedDetails++
        const status = publicFailureStatus(error)
        if (status) { publicFailure = status; reasons.push(`native-public-access-unavailable:HTTP ${status}`) }
        reasons.push(`native-detail-unresolved:${record.id}:${String(error.message).slice(0, 160)}`)
      }
    }
    abort(signal)
    const closing = publicFailure ? { rows: [], reasons: ['native-closing-not-read-public-access-unavailable'], pages: 0, reportedTotal: null, indiaFacetCount: null }
      : await readInventory({ binding, fetchJsonImpl: pacedFetchJson, signal })
    reasons.push(...closing.reasons)
    const startHash = sha(JSON.stringify(manifest(initial.rows))), closingHash = sha(JSON.stringify(manifest(closing.rows)))
    const stable = closing.pages > 0 && closing.reasons.length === 0 && startHash === closingHash && initial.reportedTotal === closing.reportedTotal && initial.indiaFacetCount === closing.indiaFacetCount
    if (!stable) reasons.push('native-closing-ids-count-countries-status-or-content-changed')
    const closingById = new Map(closing.rows.map(row => [String(row.id), row]))
    const closingReadComplete = closing.pages > 0 && closing.reasons.length === 0
    const sorted = retained.filter(job => {
      const current = closingById.get(job.nativePostingId)
      if (!current) return !closingReadComplete
      return JSON.stringify(nativeSnapshot(current)) === JSON.stringify(job.sourceNativeListing)
    }).sort((a, b) => a.index - b.index)
    const jobCap = options.maxJobs ?? maxJobs, pageCap = options.maxPages ?? maxPages
    const selected = sorted.filter(j => !Number.isInteger(pageCap) || pageCap < 1 || j.index < pageCap * initial.pageSize).slice(0, Number.isInteger(jobCap) && jobCap >= 0 ? jobCap : undefined)
    if (selected.length < sorted.length) reasons.push('caller-result-cap-after-full-enumeration-and-details')
    const complete = reasons.length === 0
    const proof = { reportedTotal: initial.reportedTotal, indiaFacetCount: initial.indiaFacetCount, distinctIds: initial.rows.length,
      indiaRecords: initial.rows.filter(r => classifyPersistentCountry(r).india).length, unknownCountries, nonIndia,
      pagesFetched: initial.pages + closing.pages, detailsFetched, detailBodiesFetched, requisitionBodiesFetched, detailsUnattempted: initial.rows.length - detailsFetched, completeDetails, failedDetails, publicFailureStatus: publicFailure || closing.publicFailure || null, closingStable: stable, droppedStaleClosingRows: retained.length - sorted.length,
      initialManifestSha256: startHash, closingManifestSha256: closingHash, reasons: [...new Set(reasons)], returned: selected.length }
    const now = new Date().toISOString()
    return attachInventoryEvidence(selected.map(({ index, ...job }) => ({ ...job, sourceNativeInventory: proof,
      sourceEnumerationComplete: initial.reasons.length === 0 && closing.reasons.length === 0 && stable,
      sourceScopeComplete: complete, sourceListingComplete: complete, lifecycleCleanupAllowed: false })), {
      status: complete ? (initial.rows.length ? 'complete-inventory' : 'verified-empty') : 'coverage-gap', surface: `${CAREERS_URL}/explore-opportunities`,
      firstParty: true, listingComplete: complete, pagesFetched: proof.pagesFetched, reportedTotal: initial.reportedTotal,
      indiaFacetCount: initial.indiaFacetCount ?? (initial.rows.length === 0 ? 0 : null), verifiedAt: now,
      reason: complete ? 'current-employer-binding-all-public-pages-full-details-and-stable-closing-native-proof' : [...new Set(reasons)].join('; '),
    })
  },
})
export const run = async (options = {}) => createPersistentScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs.json'))
  else await saveToDB(jobs, 'persistent')
}
