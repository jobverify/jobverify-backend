import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { EMBITEL_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const PROVIDER_METADATA = EMBITEL_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OPENINGS_URL = PROVIDER_METADATA.openingsPageUrl
export const JOBS_SCRIPT_URL = PROVIDER_METADATA.jobsScriptUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl

const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; Jobverify scraper)' }
const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  signal, headers: { ...headers, Accept: 'text/html,application/javascript' }, label: SOURCE, timeoutMs: 20000,
})
const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  ...options, headers: { ...headers, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
  label: SOURCE, timeoutMs: 30000,
})
const normalizeWhitespace = (value) => String(value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(Number.parseInt(n, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number.parseInt(n, 10)))
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
const stripHtml = (value) => normalizeWhitespace(decodeHtmlEntities(String(value ?? '').replace(/<[^>]*>/g, ' ')))
const hasLink = (html, expected) => [...String(html).matchAll(/(?:href|src)=["']([^"']+)["']/gi)]
  .some((match) => { try { return new URL(decodeHtmlEntities(match[1]), CAREERS_URL).toString() === expected } catch { return false } })
const indiaCity = (location) => {
  if (/\bBangalore\b|\bBengaluru\b|^BLR-/i.test(location)) return 'Bangalore'
  if (/\bPune\b/i.test(location)) return 'Pune'
  if (/\bIndia\b/i.test(location)) return location.split(',')[0].trim()
  return null
}

export const extractSearchResults = (payload) => {
  if (payload?.success !== true || !Array.isArray(payload.data)) {
    throw new Error('Embitel public jobs payload is malformed or unsuccessful')
  }
  const jobs = new Map()
  for (const row of payload.data) {
    const id = normalizeWhitespace(row?.jobpostingID)
    const title = normalizeWhitespace(row?.designation)
    const location = normalizeWhitespace(row?.location)
    const link = normalizeWhitespace(row?.job_url)
    if (!id || !title || !location || !link || !['Y', 'N'].includes(row?.posted)) {
      throw new Error('Embitel public jobs payload contains an incomplete record')
    }
    let url
    try { url = new URL(link) } catch { throw new Error('Embitel public jobs handoff is malformed') }
    if (url.protocol !== 'https:' || url.hostname !== 'diconium.wd3.myworkdayjobs.com'
      || !url.pathname.startsWith('/Embitel_Technologies/job/')) {
      throw new Error('Embitel public jobs handoff no longer matches its verified Workday board')
    }
    const city = indiaCity(location)
    if (row.posted !== 'Y' || !city) continue
    const sourceUrl = url.toString()
    const timestamp = Date.parse(row.timestamp)
    const job = {
      title, company: COMPANY,
      department: normalizeWhitespace(row.bu).replace(/_/g, ' ') || null,
      location: /\bIndia\b/i.test(location) ? location : location + ', India',
      city, country: 'India',
      jobId: id, requisitionId: url.pathname.match(/_(JR\d+)\/?$/)?.[1] || id,
      sourceUrl, applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: normalizeWhitespace(row.experience) || null,
      minimumQualification: null, preferredQualification: null, requiredSkills: [],
      postingDate: Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null,
      closingDate: null, jobDescription: stripHtml(row.jobdescription) || null,
    }
    const previous = jobs.get(id)
    if (previous && JSON.stringify(previous) !== JSON.stringify(job)) {
      throw new Error('Embitel public jobs payload contains conflicting duplicate IDs')
    }
    jobs.set(id, job)
  }
  return [...jobs.values()]
}

export const createEmbitelTechnologiesScraper = ({
  maxJobs = null, now = () => new Date().toISOString(),
} = {}) => ({
  async run({ signal, fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const request = async (fetcher, url, options = {}) => {
      signal?.throwIfAborted()
      const result = await fetcher(url, { ...options, signal })
      signal?.throwIfAborted()
      return result
    }
    if (maxJobs != null && (!Number.isInteger(maxJobs) || maxJobs <= 0)) {
      throw new Error('Embitel maxJobs must be a positive integer')
    }
    const careers = await request(fetchText, CAREERS_URL)
    if (!/Opportunities At Embitel/i.test(careers) || !hasLink(careers, OPENINGS_URL)) {
      throw new Error('Embitel official careers page no longer exposes the current openings handoff')
    }
    const openings = await request(fetchText, OPENINGS_URL)
    if (!/CARIAD India Jobs/i.test(openings) || !hasLink(openings, JOBS_SCRIPT_URL)
      || !String(openings).includes(JOBS_API_URL)) {
      throw new Error('Embitel openings page no longer exposes the verified public jobs client')
    }
    const script = await request(fetchText, JOBS_SCRIPT_URL)
    if (!/action\s*:\s*["']get_wdhub_job["']/.test(script) || !/type\s*:\s*["']POST["']/i.test(script)) {
      throw new Error('Embitel public jobs client handoff changed')
    }
    const payload = await request(fetchJson, JOBS_API_URL, { method: 'POST', body: 'action=get_wdhub_job' })
    const jobs = extractSearchResults(payload)
    const selected = maxJobs ? jobs.slice(0, maxJobs) : jobs
    return selected.map((job) => ({
      ...job, source: SOURCE, link: job.applyUrl, scrapedAt: now(),
      companyCareerPage: CAREERS_URL, companyDomain: 'embitel.com', atsPlatform: 'first-party-ajax+workday',
      ...(selected.length < jobs.length ? { sourceListingComplete: false } : {}),
    }))
  },
})

export const run = async (options = {}) => createEmbitelTechnologiesScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
