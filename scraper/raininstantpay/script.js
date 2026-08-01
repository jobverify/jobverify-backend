import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'
import { extractAshbyExperienceRequired } from '../utils/ashbyExperience.js'

import { RAIN_INSTANT_PAY_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = RAIN_INSTANT_PAY_CATALOG.source
export const COMPANY = RAIN_INSTANT_PAY_CATALOG.companyName
export const VERIFIED_ON = RAIN_INSTANT_PAY_CATALOG.verifiedOn
export const PROVIDER_METADATA = RAIN_INSTANT_PAY_CATALOG
export const CAREERS_PAGE_URL = RAIN_INSTANT_PAY_CATALOG.companyCareerPage
export const ASHBY_PUBLIC_BOARD_URL = RAIN_INSTANT_PAY_CATALOG.ashbyPublicBoardUrl
export const ASHBY_JOB_BOARD_URL = RAIN_INSTANT_PAY_CATALOG.ashbyJobBoardUrl

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(?:br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, '\n')
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
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const getAddress = (job = {}) => job?.address?.postalAddress || job?.address || {}

const buildLocation = (job = {}) => {
  const label = normalizeWhitespace(job?.location)
  const address = getAddress(job)
  const city = normalizeWhitespace(address?.addressLocality)
  const state = normalizeWhitespace(address?.addressRegion)
  const country = normalizeWhitespace(address?.addressCountry)
  const addressLocation = [city, state, country].filter(Boolean).join(', ')

  if (city && country) {
    return {
      location: [city, country].filter(Boolean).join(', '),
      city,
      state,
      country,
    }
  }

  return {
    location: label || addressLocation || null,
    city,
    state,
    country,
  }
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

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml) || ''

  return /<title>\s*Rain\s*-\s*Careers\s*<\/title>/i.test(rawHtml)
    && normalized.includes('Our mission')
    && normalized.includes('Welcome to Rain')
    && normalized.includes('See open roles')
}

export const extractVerifiedAshbyPublicBoardUrl = (html = '') =>
  /https:\/\/jobs\.ashbyhq\.com\/rain-technologies\b/i.test(String(html ?? ''))
    ? ASHBY_PUBLIC_BOARD_URL
    : null

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
      const title = normalizeWhitespace(job?.title)
      const jobId = normalizeWhitespace(job?.id)
      const sourceUrl = normalizeWhitespace(job?.jobUrl)
      const applyUrl = normalizeWhitespace(job?.applyUrl)
      const location = buildLocation(job)

      if (!title || !jobId || !sourceUrl || !applyUrl) return null

      return {
        title,
        company: COMPANY,
        department: normalizeWhitespace(job?.department),
        location: location.location,
        city: location.city,
        state: location.state,
        country: location.country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl,
        employmentType: normalizeEmploymentType(job?.employmentType),
        experienceRequired: extractAshbyExperienceRequired({
          title,
          jobDescription: normalizeWhitespace(job?.descriptionPlain ?? job?.descriptionHtml),
        }),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeWhitespace(job?.publishedAt),
        closingDate: null,
        jobDescription: normalizeWhitespace(job?.descriptionPlain ?? job?.descriptionHtml),
        remoteStatus: inferRemoteStatus(job),
      }
    })
    .filter(Boolean)

export const createRainInstantPayScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified Rain Instant Pay official careers page changed materially')
    }

    const verifiedPublicBoardUrl = extractVerifiedAshbyPublicBoardUrl(careersHtml)
    if (verifiedPublicBoardUrl !== ASHBY_PUBLIC_BOARD_URL) {
      throw new Error('Verified Ashby public board handoff changed materially')
    }

    const verifiedJobBoardUrl = buildAshbyJobBoardUrl(verifiedPublicBoardUrl)
    if (verifiedJobBoardUrl !== ASHBY_JOB_BOARD_URL) {
      throw new Error('Verified Ashby public board handoff changed materially')
    }

    const payload = await fetchJson(ASHBY_JOB_BOARD_URL)
    if (!Array.isArray(payload?.jobs)) {
      throw new Error('Verified Ashby payload changed materially')
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

export const run = async (options = {}) => createRainInstantPayScraper(options).run(options)

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
