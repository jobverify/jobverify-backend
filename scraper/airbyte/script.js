import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { filterIndiaJobs } from '../utils/indiaLocationFilter.js'
import { loadConfig } from '../utils/loadConfig.js'

import { AIRBYTE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = AIRBYTE_CATALOG.source
export const COMPANY = AIRBYTE_CATALOG.companyName
export const CAREERS_PAGE_URL = AIRBYTE_CATALOG.companyCareerPage
export const ASHBY_PUBLIC_BOARD_URL = AIRBYTE_CATALOG.ashbyPublicBoardUrl
export const ASHBY_JOB_BOARD_URL = AIRBYTE_CATALOG.ashbyJobBoardUrl

const normalizeString = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;|&#038;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#8217;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeString(value)
  if (!normalized) return null
  return normalized.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const getAddress = (location = {}) => location?.address?.postalAddress || location?.address || {}

const toLocationCandidate = (location = {}) => {
  const address = getAddress(location)
  const label = normalizeString(location?.location)
  const city = normalizeString(address?.addressLocality)
  const state = normalizeString(address?.addressRegion)
  const country = normalizeString(address?.addressCountry)

  return {
    location: label || [city, state, country].filter(Boolean).join(', '),
    city,
    state,
    country,
  }
}

const hasExplicitIndiaSignal = (candidate = {}) => {
  const location = normalizeString(candidate.location) || ''
  const country = normalizeString(candidate.country) || ''
  const city = normalizeString(candidate.city) || ''
  const state = normalizeString(candidate.state) || ''

  return /india/i.test([location, country, city, state].join(' '))
}

const selectIndiaLocation = (job = {}) => {
  const candidates = [
    toLocationCandidate({ location: job.location, address: job.address }),
    ...(Array.isArray(job.secondaryLocations) ? job.secondaryLocations : []).map(toLocationCandidate),
  ].filter((candidate) => candidate.location)

  return filterIndiaJobs(candidates).find(hasExplicitIndiaSignal) || null
}

const inferRemoteStatus = (job = {}) => {
  if (job?.isRemote === true || /remote/i.test(String(job?.workplaceType ?? ''))) return 'Remote'
  if (/hybrid/i.test(String(job?.workplaceType ?? ''))) return 'Hybrid'
  if (job?.workplaceType) return 'On-site'
  return null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedFirstPartyCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeString(rawHtml) || ''

  return /Airbyte Careers \| Build the Future of AI with Us/i.test(rawHtml)
    && /Join Airbyte and help build the dream team\./i.test(rawHtml)
    && /Careers at Airbyte/i.test(normalized)
    && /We are developing the data and action layer for AI agents\./i.test(normalized)
    && /Find your role/i.test(normalized)
    && /View open roles/i.test(normalized)
}

export const hasVerifiedAshbyBoardShellSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeString(rawHtml) || ''

  return /<title>\s*Airbyte Jobs\s*<\/title>/i.test(rawHtml)
    && /Airbyte Jobs/i.test(normalized)
    && /Engineering Manager, Platform/i.test(rawHtml)
    && /Senior AI Platform Engineer/i.test(rawHtml)
  }

export const buildAshbyJobBoardUrl = (publicBoardUrl) => {
  try {
    const url = new URL(String(publicBoardUrl ?? ''))
    if (url.hostname !== 'jobs.ashbyhq.com') return null
    const slug = url.pathname.split('/').filter(Boolean)[0]
    return slug ? `https://api.ashbyhq.com/posting-api/job-board/${slug}` : null
  } catch {
    return null
  }
}

export const extractAshbyJobs = (payload = {}) =>
  (Array.isArray(payload?.jobs) ? payload.jobs : [])
    .filter((job) => job?.isListed === true)
    .map((job) => {
      const title = normalizeString(job?.title)
      const jobId = normalizeString(job?.id)
      const sourceUrl = normalizeString(job?.jobUrl)
      const applyUrl = normalizeString(job?.applyUrl)
      const selectedLocation = selectIndiaLocation(job)

      if (!title || !jobId || !sourceUrl || !applyUrl || !selectedLocation) return null

      return {
        title,
        company: COMPANY,
        department: normalizeString(job?.department),
        location: selectedLocation.location,
        city: selectedLocation.city,
        state: selectedLocation.state,
        country: selectedLocation.country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl,
        employmentType: normalizeEmploymentType(job?.employmentType),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeString(job?.publishedAt),
        closingDate: null,
        jobDescription: normalizeString(job?.descriptionPlain ?? job?.descriptionHtml),
        remoteStatus: inferRemoteStatus(job),
      }
    })
    .filter(Boolean)

export const createAirbyteScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasVerifiedFirstPartyCareersSignal(careersHtml)) {
      throw new Error('Verified Airbyte first-party careers page changed materially')
    }

    const ashbyBoardHtml = await fetchText(ASHBY_PUBLIC_BOARD_URL)
    if (!hasVerifiedAshbyBoardShellSignal(ashbyBoardHtml)) {
      throw new Error('Verified Airbyte Ashby board shell changed materially')
    }

    const verifiedJobBoardUrl = buildAshbyJobBoardUrl(ASHBY_PUBLIC_BOARD_URL)
    if (verifiedJobBoardUrl !== ASHBY_JOB_BOARD_URL) {
      throw new Error('Verified Airbyte Ashby public board handoff changed materially')
    }

    const payload = await fetchJson(ASHBY_JOB_BOARD_URL)
    if (!Array.isArray(payload?.jobs)) {
      throw new Error('Verified Airbyte Ashby payload changed materially')
    }

    const jobs = extractAshbyJobs(payload)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAirbyteScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
