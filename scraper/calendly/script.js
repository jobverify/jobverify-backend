import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'
import { CANONICAL_CITIES } from '../../scraper-support/utils/cities.js'

import { CALENDLY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = CALENDLY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const GREENHOUSE_BOARD_URL = PROVIDER_METADATA.greenhouseBoardUrl
export const GREENHOUSE_JOBS_API_URL = PROVIDER_METADATA.greenhouseJobsApiUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeEntities = value => String(value ?? '').replace(/&(#x[\da-f]+|#\d+|amp|nbsp|quot|apos|lt|gt|ndash|mdash|rsquo|lsquo|ldquo|rdquo|hellip);/gi, (entity, key) => {
  if (key.startsWith('#')) return String.fromCodePoint(key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1)))
  return ({ amp: '&', nbsp: ' ', quot: '"', apos: "'", lt: '<', gt: '>', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…' })[key.toLowerCase()]
})
const decodeHtml = value => {
  let decoded = String(value ?? '')
  // Greenhouse content=true returns escaped HTML with some entities escaped again.
  for (let pass = 0; pass < 3; pass++) decoded = decodeEntities(decoded)
  return normalizeWhitespace(decoded)
}

const collectLocationValues = (job = {}) => [
  normalizeWhitespace(job?.location?.name),
  ...(Array.isArray(job?.offices)
    ? job.offices.map((office) => normalizeWhitespace(office?.location || office?.name))
    : []),
  ...(Array.isArray(job?.metadata)
    ? job.metadata.filter(entry => /^(country|job country|location)$/i.test(entry?.name || '')).map((entry) => normalizeWhitespace(entry?.value))
    : []),
].filter(Boolean)

const hasIndiaMarker = (value) => /\bindia\b/i.test(String(value ?? ''))

const inferCity = (location) => {
  const firstToken = normalizeWhitespace(location)?.split(',')[0]?.trim()
  if (!firstToken || /^india$/i.test(firstToken)) return null
  return firstToken
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: CAREERS_URL,
    ...(options.headers || {}),
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const buildGreenhouseJobsApiUrl = () => `${GREENHOUSE_JOBS_API_URL}?content=true`

export const normalizeGreenhouseJobUrl = (value, jobId) => {
  const canonicalJobId = normalizeWhitespace(jobId)
  if (!canonicalJobId) return null

  try {
    const url = new URL(value)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, '')

    if (hostname !== 'job-boards.greenhouse.io') return null
    if (pathname !== `/calendly/jobs/${canonicalJobId}`) return null

    return `https://job-boards.greenhouse.io/calendly/jobs/${canonicalJobId}`
  } catch {
    return null
  }
}

const careersHandoff = html => [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
  .map(match => { try { return new URL(decodeEntities(match[1])) } catch { return null } })
  .filter(url => url?.protocol === 'https:' && ['boards.greenhouse.io', 'job-boards.greenhouse.io'].includes(url.hostname)
    && (/^\/calendly(?:\/jobs\/\d+)?\/?$/.test(url.pathname)
      || (url.pathname === '/embed/job_app' && url.searchParams.get('for') === 'calendly' && /^\d+$/.test(url.searchParams.get('token') || ''))))
const careersJobIds = html => [...new Set(careersHandoff(html).map(url => url.pathname.match(/^\/calendly\/jobs\/(\d+)\/?$/)?.[1]
  || (url.pathname === '/embed/job_app' ? url.searchParams.get('token') : null)).filter(Boolean))]
const countryForJob = job => {
  const values = collectLocationValues(job)
  const india = values.some(value => hasIndiaMarker(value) || /^IN$/i.test(value)
    || (CANONICAL_CITIES[value.split(',')[0].trim().toLowerCase()] && !/^(remote|none)$/i.test(value)))
  const foreign = values.some(value => /\b(?:US|USA|United States|Canada|United Kingdom|UK|Singapore|Australia|Germany|Ireland|Philippines)\b/i.test(value)
    || /^San Francisco(?: \(Hybrid\))?$/i.test(value))
  if (india && foreign) throw new Error('Calendly contradictory public location country')
  if (!india && !foreign) throw new Error('Calendly unresolved public location country')
  return { country: india ? 'India' : 'foreign', location: values.find(value => hasIndiaMarker(value)) || normalizeWhitespace(job.location?.name) || values[0] }
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page) || ''
  const hasVerifiedHeroCopy =
    normalized.includes('Join us in creating better meeting experiences')
    || normalized.includes('Join us in helping people make space for what matters')

  return /<title>\s*Let(?:'|&#x27;|&#39;|&apos;)s make meetings better together \| Calendly\s*<\/title>/i.test(page)
    && normalized.includes('Careers at Calendly')
    && hasVerifiedHeroCopy
    && (
      (
        normalized.includes('Filter by location')
        && normalized.includes('Filter by department')
        && careersHandoff(page).length > 0
      ) || (
        normalized.includes('Open roles')
        && normalized.includes('Take a look at our open positions and join us on our mission to make people love meetings.')
      )
    )
    && careersHandoff(page).length > 0
    && normalized.includes('Copyright Calendly')
}

export const extractIndiaJobsFromGreenhousePayload = (
  payload,
  { scrapedAt = new Date().toISOString() } = {},
) => {
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs : null
  if (!jobs) {
    throw new Error('Calendly Greenhouse jobs API response no longer matches the expected payload')
  }

  if (!Number.isSafeInteger(payload?.meta?.total) || payload.meta.total !== jobs.length) {
    throw new Error('Calendly incomplete Greenhouse inventory: reported count disagrees')
  }
  const seen = new Set()
  for (const job of jobs) {
    if (!/^\d+$/.test(String(job?.id ?? '')) || !Number.isSafeInteger(Number(job.id)) || Number(job.id) <= 0 || seen.has(String(job.id))) {
      throw new Error('Calendly repeated or invalid public job identity')
    }
    seen.add(String(job.id))
  }

  return jobs.flatMap((job) => {
    const title = normalizeWhitespace(job?.title)
    const companyName = normalizeWhitespace(job?.company_name)
    const sourceUrl = normalizeGreenhouseJobUrl(job?.absolute_url, job?.id)

    if (!companyName || companyName.toLowerCase() !== COMPANY_NAME.toLowerCase()) {
      throw new Error('Calendly Greenhouse payload no longer maps to the verified company identity')
    }

    if (!title || !sourceUrl) {
      throw new Error('Calendly Greenhouse payload no longer exposes the verified Greenhouse detail route')
    }

    if (typeof job?.content !== 'string') throw new Error('Calendly malformed full public job description')
    const jobDescription = decodeHtml(job?.content)
    if (!jobDescription) throw new Error('Calendly incomplete public job description')
    const { country, location } = countryForJob(job)
    if (country !== 'India') return []

    return [{
      title,
      company: COMPANY_NAME,
      location,
      city: inferCity(location),
      country: 'India',
      link: sourceUrl,
      applyUrl: sourceUrl,
      sourceUrl,
      source: SOURCE,
      jobId: String(job?.id),
      requisitionId: normalizeWhitespace(job?.requisition_id),
      department: normalizeWhitespace(job?.departments?.[0]?.name),
      employmentType: null,
      experienceRequired: null,
      jobDescription,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: normalizeWhitespace(job?.updated_at || job?.first_published),
      scrapedAt,
    }]
  })
}

export const createCalendlyScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = () => new Date().toISOString(),
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Calendly verified official careers page no longer matches the trusted public surface')
    }

    const payload = await fetchJson(buildGreenhouseJobsApiUrl(), { method: 'GET' })
    const scrapedAt = now()
    const jobs = extractIndiaJobsFromGreenhousePayload(payload, { scrapedAt })
    const cardIds = careersJobIds(careersHtml)
    if (cardIds.length && (cardIds.length !== payload.jobs.length || payload.jobs.some(job => !cardIds.includes(String(job.id))))) {
      throw new Error('Calendly official careers role cards and complete API inventory disagree')
    }
    const last = await fetchJson(buildGreenhouseJobsApiUrl(), { method: 'GET' })
    extractIndiaJobsFromGreenhousePayload(last, { scrapedAt })
    const fingerprint = value => JSON.stringify([...value.jobs].sort((a, b) => Number(a.id) - Number(b.id)))
    if (fingerprint(last) !== fingerprint(payload)) throw new Error('Calendly public inventory changed during validation')
    return attachInventoryEvidence(jobs, {
      status: payload.meta.total ? 'complete-inventory' : 'verified-empty',
      surface: buildGreenhouseJobsApiUrl(), firstParty: true, listingComplete: true, pagesFetched: 3,
      reportedTotal: payload.meta.total, indiaFacetCount: jobs.length, verifiedAt: scrapedAt,
      reason: 'Verified Calendly Greenhouse handoff, complete total/unique identities/full descriptions, matching public career cards and stable full snapshot before country filtering.',
    })
  },
})

export const run = async (options = {}) => createCalendlyScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
