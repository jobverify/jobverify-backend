import { runApiPortalScraper } from '../apiPortal/engine.js'
import { expandApiPortalProviderTemplate } from '../providers/apiPortalTemplates.js'
import { extractAshbyJobs } from './ashbyApi.js'
import { fetchJsonWithRetry } from './fetch.js'
import { filterIndiaJobs } from './indiaLocationFilter.js'
import { attachInventoryEvidence, readInventoryEvidence, isFreshCompleteInventoryEvidence } from './inventoryEvidence.js'
import { hasSourceDescription } from '../../src/utils/jobSourceContent.js'

// Generic remote work is not evidence that an employer accepts applicants in India.
const INDIA_LOCATION = /\bindia\b|\bbengaluru\b|\bbangalore\b|\bhyderabad\b|\bpune\b|\bgurugram\b|\bgurgaon\b|\bmumbai\b|\bchennai\b|\bnoida\b|\bdelhi\b|\bahmedabad\b/i
const TALENT_POOL = /talent (community|network|pool)|speculative|future opportunities|general application/i
// apiPortal's country defaults to the provider filter; only source location text proves eligibility.
const indiaLocation = (job) => INDIA_LOCATION.test([job.location, job.city].filter(Boolean).join(' '))
const httpUrl = (value) => { try { return ['https:', 'http:'].includes(new URL(value).protocol) } catch { return false } }
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryNames = new Map()
const foreignCountryLabels = new Set(['United States of America', 'USA', 'U.S.A.', 'US', 'UK', 'UAE', 'GBR', 'SGP'])
for (let a = 65; a <= 90; a++) for (let b = 65; b <= 90; b++) {
  const code = String.fromCharCode(a, b), name = regionNames.of(code)
  if (name && name !== code && !['ZZ', 'EU', 'UN', 'XA', 'XB', 'QO'].includes(code)) {
    countryNames.set(code.toLowerCase(), code)
    countryNames.set(name.toLowerCase(), code)
    if (code !== 'IN') foreignCountryLabels.add(name)
  }
}
for (const [name, code] of Object.entries({ IND: 'IN', USA: 'US', 'United States of America': 'US', GBR: 'GB', UK: 'GB', SGP: 'SG', CAN: 'CA', AUS: 'AU' })) countryNames.set(name.toLowerCase(), code)
const nativeCountry = value => typeof value === 'string' ? countryNames.get(value.trim().toLowerCase()) || null : null
const escapePattern = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const foreignCountryPattern = new RegExp(`(?:^|[^\\p{L}])(?:${[...foreignCountryLabels].sort((a, b) => b.length - a.length).map(escapePattern).join('|')})(?=$|[^\\p{L}])`, 'iu')
const nativeText = value => typeof value === 'string' && value.trim().length > 0
const inventoryError = payload => payload && !Array.isArray(payload) && (payload.success === false || payload.ok === false
  || payload.hasError === true || payload.failed === true || Boolean(payload.error)
  || (Array.isArray(payload.errors) ? payload.errors.length > 0 : Boolean(payload.errors))
  || /^(?:error|failed|failure|unavailable)$/i.test(String(payload.status || ''))
  || (Number.isFinite(Number(payload.status)) && Number(payload.status) >= 400)
  || (Number.isFinite(Number(payload.statusCode)) && Number(payload.statusCode) >= 400))
const validateAshbyInventory = (payload, records, provider) => {
  const fail = reason => { throw new Error(`[${provider.source}] Invalid ashby inventory: ${reason}`) }
  if (payload.apiVersion != null && payload.apiVersion !== '1') fail('unsupported native schema')
  const reasons = payload.apiVersion === '1' ? [] : ['native-api-version-unavailable']
  const identities = new Set()
  for (const record of records) {
    if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.isListed !== 'boolean') fail('unknown active status')
    if (!nativeText(record.id) || !/^[a-z0-9][a-z0-9._-]{0,255}$/i.test(record.id) || identities.has(record.id)) fail('missing or repeated native identity')
    identities.add(record.id)
    if (!record.isListed) continue
    if (!nativeText(record.title)) fail('missing title')
    for (const [field, suffix] of [['jobUrl', ''], ['applyUrl', '/application']]) {
      if (!nativeText(record[field])) fail('non-string application identity')
      let url
      try { url = new URL(record[field]) } catch { fail('invalid application identity') }
      if (url.origin !== 'https://jobs.ashbyhq.com' || url.username || url.password || url.search || url.hash
        || url.pathname !== `/${encodeURIComponent(provider.boardToken)}/${encodeURIComponent(record.id)}${suffix}`) fail('foreign board or role identity')
    }
    for (const field of ['descriptionHtml', 'descriptionPlain']) {
      if (record[field] != null && typeof record[field] !== 'string') fail('non-string native content')
    }
    if (record.secondaryLocations != null && !Array.isArray(record.secondaryLocations)) fail('invalid secondary location inventory')
    const candidates = [{ location: record.location, address: record.address }, ...(record.secondaryLocations || [])]
    let unknownScope = false
    for (const candidate of candidates) {
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)
        || (candidate.location != null && typeof candidate.location !== 'string')
        || (candidate.address != null && (typeof candidate.address !== 'object' || Array.isArray(candidate.address)))) fail('invalid native location')
      if (candidate.address?.postalAddress != null && (typeof candidate.address.postalAddress !== 'object'
        || Array.isArray(candidate.address.postalAddress))) fail('invalid postal location')
      const address = candidate.address?.postalAddress || candidate.address || {}
      if (typeof address !== 'object' || Array.isArray(address)) fail('invalid postal location')
      for (const field of ['addressCountry', 'addressLocality', 'addressRegion']) {
        if (address[field] != null && typeof address[field] !== 'string') fail('non-string native location')
      }
      const country = nativeCountry(address.addressCountry)
      const labelIndia = INDIA_LOCATION.test(candidate.location || '')
      const labelForeign = foreignCountryPattern.test(candidate.location || '')
      if (country && country !== 'IN' && labelIndia) fail('contradictory country/location')
      if ((country === 'IN' || labelIndia) && labelForeign) fail('contradictory country/location')
      if (country === 'IN' && nativeText(candidate.location)
        && !filterIndiaJobs([{ country: 'India', location: candidate.location }]).length) fail('contradictory country/location')
      // Missing countries are documented by Ashby. Retain unknown scope instead
      // of certifying a globally remote or unrecognized label as zero India.
      if ((!country && !labelIndia && !labelForeign) || (nativeText(address.addressCountry) && !country)) unknownScope = true
    }
    if (unknownScope) reasons.push('native-location-scope-unresolved')
  }
  return [...new Set(reasons)]
}

export const createPublishingGapAtsScraper = (provider) => ({
  async run({ fetchJson = (url, options) => fetchJsonWithRetry(url, { ...options, timeoutMs: 20000, label: provider.source }), signal } = {}) {
    const kind = provider.atsPlatform
    if (!['greenhouse', 'ashby', 'lever'].includes(kind)) throw new Error(`Unsupported ATS: ${kind}`)
    const token = encodeURIComponent(provider.boardToken)
    const url = kind === 'greenhouse'
      ? `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`
      : kind === 'ashby'
        ? `https://api.ashbyhq.com/posting-api/job-board/${token}`
        : `https://api.lever.co/v0/postings/${token}?mode=json`
    const payload = await fetchJson(url, { signal })
    if (inventoryError(payload)) throw new Error(`[${provider.source}] Failed ${kind} inventory envelope`)
    const records = kind === 'lever' ? payload : payload?.jobs
    if (!Array.isArray(records)) throw new Error(`[${provider.source}] Invalid ${kind} inventory`)
    const reported = payload?.meta?.total ?? payload?.total ?? null
    if (payload?.hasMore === true || (reported != null && Number(reported) !== records.length)) {
      throw new Error(`[${provider.source}] Incomplete ${kind} inventory`)
    }
    const nativeReasons = kind === 'ashby' ? validateAshbyInventory(payload, records, provider) : []
    const active = records.filter((record) => record?.isListed !== false)
    if (active.some((record) => !record?.id || !(record.title || record.text))) {
      throw new Error(`[${provider.source}] Malformed ${kind} inventory record`)
    }
    if (active.some((record) => !httpUrl(kind === 'greenhouse' ? record.absolute_url : record.applyUrl))) {
      throw new Error(`[${provider.source}] Invalid ${kind} application URL`)
    }
    let mapped
    if (kind === 'ashby') {
      mapped = extractAshbyJobs({ payload, companyName: provider.companyName })
    } else {
      const config = expandApiPortalProviderTemplate({ ...provider, template: kind, templateOptions: { boardToken: provider.boardToken } })
      // Greenhouse updated_at is an edit timestamp, not the original posting date.
      if (kind === 'greenhouse') config.config.mapping.postingDate = 'first_published'
      const prepared = kind === 'lever'
        ? records.map((record) => ({ ...record, descriptionBodyPlain: [record.descriptionPlain || record.description, ...(record.lists || []).map((section) => `${section.text || ''}\n${section.content || ''}`), record.additionalPlain || record.additional].filter(Boolean).join('\n\n') || null }))
        : payload
      mapped = await runApiPortalScraper({ provider: config, fetchJson: async () => prepared })
    }
    const located = filterIndiaJobs(mapped).filter(job => indiaLocation(job)
      || (kind === 'ashby' && /^(?:india|in|ind)$/i.test(job.country || '')))
    const jobs = located.filter((job) => !TALENT_POOL.test(job.title)).map((job) => ({
      ...job,
      source: provider.source,
      company: provider.companyName,
      link: job.applyUrl,
      postingDate: job.postingDate || null,
      scrapedAt: new Date().toISOString(),
    }))
    const innerEvidence = readInventoryEvidence(mapped)
    const incompleteReasons = [...nativeReasons]
    // Ashby's helper only maps the validated complete single response. The API
    // portal engine additionally owns Greenhouse/Lever pagination and details;
    // its evidence and lifecycle guards cannot be promoted by this wrapper.
    if (kind !== 'ashby' && !isFreshCompleteInventoryEvidence(innerEvidence)) {
      incompleteReasons.push(innerEvidence?.reason || 'inner-inventory-evidence-unavailable')
    }
    if (mapped.some(job => job.sourceListingComplete === false)) incompleteReasons.push('inner-source-listing-incomplete')
    if (jobs.some(job => !hasSourceDescription(job))) incompleteReasons.push('selected-role-description-unavailable')
    const listingComplete = incompleteReasons.length === 0
    if (!listingComplete) for (const job of jobs) job.sourceListingComplete = false
    return attachInventoryEvidence(jobs, {
      status: listingComplete ? records.length === 0 ? 'verified-empty' : 'complete-inventory' : 'discovery-only',
      surface: url,
      firstParty: kind === 'ashby' || innerEvidence?.firstParty === true,
      listingComplete,
      pagesFetched: innerEvidence?.pagesFetched ?? 1,
      reportedTotal: innerEvidence?.reportedTotal ?? (kind === 'greenhouse' ? null : records.length),
      indiaFacetCount: located.length,
      verifiedAt: new Date().toISOString(),
      reason: listingComplete ? `${kind}-public-posting-api-complete-single-response`
        : `${kind}-public-posting-api-incomplete:${incompleteReasons.join(';')}`,
    })
  },
})
