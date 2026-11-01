import fs from 'node:fs'
import {createHash} from 'node:crypto'
import {createHiBobNativeInventory} from '../../scraper-support/hibob/nativeInventory.js'
import {readInventoryEvidence, attachInventoryEvidence, normalizeInventoryEvidence} from '../../scraper-support/utils/inventoryEvidence.js'
import {readVisibleNativeDocument} from '../../scraper-support/utils/visibleNativeHtml.js'
import {extractActiveDescription} from '../../scraper-support/utils/activeNativeHtml.js'
import {NATIVE_CONFIG} from './catalog.js'

const reviewed = JSON.parse(fs.readFileSync(new URL('./reviewedNative.json', import.meta.url), 'utf8'))
const hash = text => createHash('sha256').update(text).digest('hex')
const stable = value => {
  assertSafeNumbers(value)
  return JSON.stringify(value, (_, v) => v && !Array.isArray(v) && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v)
}
const keysAre = (value, keys) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length === keys.length && keys.every(k => Object.hasOwn(value, k))
const sections = ['description', 'responsibilities', 'requirements', 'benefits', 'payTransparencySalaryAdditionalInfo']
const compensation = ['payTransparencyMinSalary', 'payTransparencyMaxSalary', 'payTransparencySalaryCurrency', 'payTransparencySalaryPayPeriod']
const countries = new Map([['United Kingdom', 'GB'], ['United States', 'US'], ['India', 'IN']])
const requireProof = (ok, message) => { if (!ok) throw new Error('Snowplow native proof: ' + message) }
const assertSafeNumbers = value => {
  const pending = [value]
  while (pending.length) {
    const item = pending.pop()
    if (typeof item === 'number') requireProof(Number.isFinite(item) && (!Number.isInteger(item) || Number.isSafeInteger(item)), 'unsafe native JSON numeric value')
    else if (item && typeof item === 'object') for (const child of Object.values(item)) pending.push(child)
  }
}
const decimalIdentity = literal => {
  const match = literal.match(/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/)
  requireProof(match, 'unsafe native JSON numeric token')
  const digits = (match[2] + (match[3] || '')).replace(/^0+/, '')
  if (!digits) return '0'
  const coefficient = digits.replace(/0+$/, ''), exponent = Number(match[4] || 0)
  const power = exponent - (match[3]?.length || 0) + digits.length - coefficient.length
  requireProof(Number.isSafeInteger(exponent) && Number.isSafeInteger(power), 'unsafe native JSON numeric exponent')
  return match[1] + coefficient + 'e' + power
}
const parseNativeJSON = text => {
  const value = JSON.parse(text)
  assertSafeNumbers(value)
  // Inspect literal tokens as well as parsed values. JSON.parse can round an
  // unsafe fractional identity to a reviewed integer or underflow a nonzero
  // criterion to zero; JSON.stringify would then conceal the original change.
  const number = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '"') {
      for (index++; index < text.length; index++) {
        if (text[index] === '\\') index++
        else if (text[index] === '"') break
      }
    } else if (text[index] === '-' || /\d/.test(text[index])) {
      number.lastIndex = index
      const literal = number.exec(text)?.[0]
      requireProof(literal && decimalIdentity(literal) === decimalIdentity(String(Number(literal))), 'unsafe native JSON numeric precision loss')
      index = number.lastIndex - 1
    }
  }
  return value
}
const defaultFetchPage = async (url, init) => {
  const response = await fetch(url, init), chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > 8 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error('Snowplow response byte cap exceeded') }
    chunks.push(chunk)
  }
  // Response.text supplies native BOM/UTF-8 semantics; never Buffer.toString a response.
  return {status: response.status, url: response.url, contentType: response.headers.get('content-type'), body: await new Response(Buffer.concat(chunks)).text()}
}
const calendar = value => {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return false
  const match = value.match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d{1,9})?(Z|[+-]\d\d:\d\d)$/)
  if (!match) return false
  const [, y, m, d, h, min, sec, zone] = match, max = new Date(Date.UTC(+y, +m, 0)).getUTCDate()
  return +m >= 1 && +m <= 12 && +d >= 1 && +d <= max && +h < 24 && +min < 60 && +sec < 60
    && (zone === 'Z' || +zone.slice(1, 3) <= 23 && +zone.slice(4) <= 59) && Number.isFinite(Date.parse(value))
}
const visibleSection = value => {
  if (value == null || value === '') return null
  requireProof(typeof value === 'string', 'section scalar type changed')
  const document = readVisibleNativeDocument(value, {strict: true}), root = document.nodes(n => n.tag === 'root')[0]
  const visible = root ? extractActiveDescription(document.text(root)) : null
  requireProof(visible && visible === extractActiveDescription(value), 'hidden or incomplete role criteria')
  return visible
}
const validateRow = raw => {
  requireProof(keysAre(raw, Object.keys(reviewed.observedRowFieldTypes)), 'native role fields changed')
  for (const [key, allowed] of Object.entries(reviewed.observedRowFieldTypes)) {
    const type = raw[key] === null ? 'null' : Array.isArray(raw[key]) ? 'array' : typeof raw[key]
    requireProof(allowed.includes(type), 'native field type changed: ' + key)
  }
  requireProof(keysAre(raw.sectionLabels, Object.keys(raw.sectionLabels)) && Object.keys(raw.sectionLabels).every(k => [...sections, 'payTransparencySalary'].includes(k) && typeof raw.sectionLabels[k] === 'string'), 'section label criteria changed')
  requireProof(countries.has(raw.country), 'unresolved typed native country')
  requireProof(!countries.has(raw.site) || countries.get(raw.site) === countries.get(raw.country), 'native site country conflict')
  requireProof(['publishedAt', 'validThrough', 'closingDate'].every(k => calendar(raw[k])), 'native calendar date invalid')
  const nativeSections = Object.fromEntries(sections.map(k => [k, visibleSection(raw[k])]))
  requireProof(nativeSections.description, 'full description missing')
  // Country-only scalar validation cannot rule out new location alternatives
  // embedded in employer criteria. Bind the entire reviewed original record;
  // never remove description/date/geo fields to make a changed role qualify.
  requireProof(reviewed.forms[raw.id]?.fullRawRoleCriteriaSha256 === hash(stable(raw)), 'unreviewed complete native role criteria or location alternatives')
  return {jobId: raw.id, countryCode: countries.get(raw.country), rawCountry: raw.country, rawSite: raw.site, nativeSections}
}
const validateForm = (payload, raw, row) => {
  const pin = reviewed.forms[raw.id], data = payload?.data, job = data?.jobAd
  requireProof(pin && keysAre(payload, ['metadata', 'data']) && keysAre(data, ['jobAd', 'companyLists', 'agency', 'supportedFileTypes']), 'unreviewed role application schema')
  requireProof(hash(stable(payload.metadata)) === pin.metadataSha256, 'unreviewed nested application metadata')
  requireProof(hash(stable(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'jobAd')))) === pin.otherDataSha256, 'unreviewed application supporting criteria')
  requireProof(keysAre(job, ['applicationForm', 'jobDescription', 'type', 'title', 'site', 'languageCode', 'employmentType', 'workspaceType']) && job.type === 'api'
    && job.title === raw.title && job.site === raw.site + ', ' + raw.country && job.languageCode === raw.language
    && job.employmentType === raw.employmentType && job.workspaceType === raw.workspaceType, 'native role/application identity conflict')
  requireProof(hash(stable(job.applicationForm)) === pin.applicationFormSha256, 'unreviewed application mandatory fields/questions')
  const allowed = [...sections, ...compensation, 'sectionLabels'], prefix = '/jobAd/descriptionId./jobDescription/'
  requireProof(job.jobDescription && typeof job.jobDescription === 'object' && !Array.isArray(job.jobDescription)
    && Object.keys(job.jobDescription).every(k => allowed.some(a => k === prefix + a)), 'unknown nested role description criteria')
  for (const key of allowed) {
    const cell = job.jobDescription[prefix + key]
    requireProof(cell == null || keysAre(cell, ['value']), 'unknown nested criteria properties')
    requireProof(stable(cell?.value ?? null) === stable(raw[key] ?? null), 'raw native detail criteria mismatch: ' + key)
    if (sections.includes(key)) requireProof(visibleSection(cell?.value) === row.nativeSections[key], 'native visible detail criteria mismatch')
  }
  return payload
}

// The original engine always receives the original responses. Only its one
// reviewed obsolete-client guard is eligible for supplementation; every other
// gap survives. Resource bodies, MIME, and the one actual stylesheet redirect
// are pinned to independently retained public responses.
export const createCurrentSnowplowScraper = (defaults = {}) => ({async run(options = {}) {
  const settings = {...defaults, ...options}, load = settings.fetchPage || defaultFetchPage, receipts = []
  const fetchPage = async (url, init) => {
    settings.signal?.throwIfAborted()
    const response = await load(url, init)
    settings.signal?.throwIfAborted()
    receipts.push({url, response})
    if (url === NATIVE_CONFIG.careers || url === NATIVE_CONFIG.board) {
      const expected = url === NATIVE_CONFIG.careers ? reviewed.corporateBodySha256 : reviewed.boardBodySha256
      const accepted = response?.status === 200 && response.url === url && /^text\/html\b/i.test(response.contentType || '')
        && typeof response.body === 'string' && hash(response.body) === expected
      if (!accepted) {
        const reason = 'unreviewed complete raw employer/native DOM or activation'
        throw Object.assign(Error('Snowplow native proof: ' + reason), {code:'SNOWPLOW_NATIVE_UNREVIEWED',
          abortRetries:true,failureKind:'incomplete_listing',source:'snowplow',sourceListingComplete:false,sourceScopeComplete:false,
          status:response?.status??null,requestUrl:url,finalUrl:response?.url??null,retainedNativeResponses:receipts,
          inventoryEvidence:normalizeInventoryEvidence({status:'coverage-gap',surface:url,firstParty:true,listingComplete:false,
            pagesFetched:receipts.length,reportedTotal:null,indiaFacetCount:null,verifiedAt:new Date().toISOString(),reason})})
      }
      if (url === NATIVE_CONFIG.careers) {
        const document = readVisibleNativeDocument(response.body, {strict: true})
        requireProof(document.nodes(n => n.tag === 'a' && n.attrs.href === NATIVE_CONFIG.board && document.text(n)).length > 0, 'visible first-party handoff missing')
      }
    }
    return response
  }
  const jobs = await createHiBobNativeInventory(NATIVE_CONFIG, {...settings, fetchPage}).run()
  const originalEngineEvidence = readInventoryEvidence(jobs), gaps = [], detailProofs = [], countryProofs = []
  const audit = {originalEngineEvidence, nativeInventoryCount: null, canonicalCountryCounts: {}, countryProofs, detailProofs, gaps,
    rawOpeningFeed: null, rawClosingFeed: null, rawOpeningSite: null, rawClosingSite: null, receipts, sourceScopeComplete: false}
  const retainedNative = url => receipts.filter(r => r.url === url).map(r => JSON.parse(r.response.body))
  const feedUrl = NATIVE_CONFIG.board + 'api/job-ad', siteUrl = NATIVE_CONFIG.board + 'api/career-site'
  audit.rawOpeningFeed = retainedNative(feedUrl)[0]
  audit.rawClosingFeed = retainedNative(feedUrl).at(-1)
  audit.rawOpeningSite = retainedNative(siteUrl)[0]
  audit.rawClosingSite = retainedNative(siteUrl).at(-1)
  const get = async (url, kind, resource = null) => {
    const response = await fetchPage(url, {method: 'GET', headers: {Accept: kind === 'json' ? 'application/json' : '*/*', ...(kind === 'json' ? {companyIdentifier: 'snowplow'} : {}), ...resource?.requestHeaders},
      signal: settings.signal ? AbortSignal.any([settings.signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000)})
    requireProof(response?.status === 200 && response.url === (resource?.finalUrl || url) && typeof response.body === 'string' && Buffer.byteLength(response.body) <= 8 * 1024 * 1024
      && (!resource || response.contentType === resource.contentType)
      && (kind === 'json' ? /^application\/json\b/i : kind === 'html' ? /^text\/html\b/i : /^(?:text|application)\/(?:javascript|css)\b/i).test(response.contentType || ''), 'public response status/identity/MIME/cap changed')
    return kind === 'json' ? parseNativeJSON(response.body) : response.body
  }
  try {
    // Preserve the originals in receipts/audit, then validate every original
    // engine JSON response before any supplemental type, hash or pin claims.
    for (const receipt of receipts) if (receipt.url.startsWith(NATIVE_CONFIG.board + 'api/')) parseNativeJSON(receipt.response.body)
    requireProof(originalEngineEvidence?.reason === 'hibob-native-incomplete:public-client-contract-changed', 'original engine has additional unresolved guards: ' + originalEngineEvidence?.reason)
    for (const resource of reviewed.resources) requireProof(hash(await get(resource.url, 'program', resource)) === resource.sha256, 'declared native renderer/style/program changed: ' + resource.url)
    for (const resource of reviewed.unresolvedResources) gaps.push('unreviewed-declared-stylesheet:' + resource.url)
    requireProof(hash(stable(audit.rawOpeningSite)) === reviewed.siteCanonicalSha256, 'native employer configuration/side channels changed')
    for (const group of Object.values(audit.rawOpeningFeed.filterGroups)) requireProof(Array.isArray(group)
      && group.every(item => keysAre(item, ['serverId', 'value']) && ['string', 'number'].includes(typeof item.serverId)
        && typeof item.value === 'string'), 'unknown nested filter identity/criteria')
    const rawRows = audit.rawOpeningFeed.jobAdDetails, rows = rawRows.map(validateRow)
    audit.nativeInventoryCount = rawRows.length
    for (const row of rows) { countryProofs.push(row); audit.canonicalCountryCounts[row.countryCode] = (audit.canonicalCountryCounts[row.countryCode] || 0) + 1 }
    for (const [index, raw] of rawRows.entries()) {
      const url = NATIVE_CONFIG.board + 'api/job-ad/' + raw.id + '/application-form'
      detailProofs.push({jobId: raw.id, url, rawOpening: validateForm(await get(url, 'json'), raw, rows[index]), rawClosing: null})
    }
    await get(NATIVE_CONFIG.careers, 'html')
    await get(NATIVE_CONFIG.board, 'html')
    audit.rawClosingSite = await get(siteUrl, 'json')
    audit.rawClosingFeed = await get(feedUrl, 'json')
    requireProof(stable(audit.rawOpeningSite) === stable(audit.rawClosingSite) && stable(audit.rawOpeningFeed) === stable(audit.rawClosingFeed), 'full raw closing cohort/criteria changed')
    for (const [index, proof] of detailProofs.entries()) {
      proof.rawClosing = validateForm(await get(proof.url, 'json'), rawRows[index], rows[index])
      requireProof(stable(proof.rawOpening) === stable(proof.rawClosing), 'full raw closing application criteria changed')
    }
    // Re-read the actual complete activated/reachable cohort, including the
    // unversioned typography alias. Version-looking URLs are not freshness proof.
    for (const resource of reviewed.resources) requireProof(hash(await get(resource.url, 'program', resource)) === resource.sha256, 'closing declared native renderer/style/program changed: ' + resource.url)
    // Positive India jobs need the strongest engine's current application proof
    // plus a separately reviewed criteria projection before supplementing scope.
    if (rows.some(row => row.countryCode === 'IN')) gaps.push('India-application-criteria-projection-unreviewed')
  } catch (error) {
    settings.signal?.throwIfAborted()
    gaps.push(error.message)
  }
  settings.signal?.throwIfAborted()
  const complete = gaps.length === 0 && audit.rawClosingFeed !== null
  audit.sourceScopeComplete = complete
  for (const job of jobs) if (!complete) Object.assign(job, {sourceListingComplete: false, sourceScopeComplete: false, lifecycleCleanupAllowed: false,
    sourceDetailComplete: false, sourceDetailFailureKind: 'snowplow-current-native-proof-incomplete'})
  await settings.onAudit?.(audit)
  settings.signal?.throwIfAborted()
  return attachInventoryEvidence(jobs, {...originalEngineEvidence, listingComplete: complete, status: complete ? audit.nativeInventoryCount ? 'complete-inventory' : 'verified-empty' : 'discovery-only',
    reportedTotal: complete ? audit.nativeInventoryCount : null, indiaFacetCount: complete ? jobs.length : null, pagesFetched: receipts.length,
    reason: complete ? 'snowplow-current-declared-client-and-full-native-cohort-reconciled' : 'snowplow-current-native-partial:' + gaps.join(';')})
}})
