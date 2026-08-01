import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { filterIndiaJobs } from '../../scraper-support/utils/indiaLocationFilter.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { extractAshbyExperienceRequired } from '../../scraper-support/utils/ashbyExperience.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'lilt'
export const COMPANY = 'LILT'
export const VERIFIED_ON = '2026-07-25'
export const COMMUNITY_PAGE_URL = 'https://lilt.com/products/community'
export const ASHBY_PUBLIC_BOARD_URL = 'https://jobs.ashbyhq.com/lilt-production'
export const ASHBY_JOB_BOARD_URL = 'https://api.ashbyhq.com/posting-api/job-board/lilt-production'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: COMMUNITY_PAGE_URL,
  ashbyPublicBoardUrl: ASHBY_PUBLIC_BOARD_URL,
  ashbyJobBoardUrl: ASHBY_JOB_BOARD_URL,
  verifiedOn: VERIFIED_ON,
}

const hasExplicitIndiaSignal = (candidate = {}) => {
  const location = normalizeString(candidate.location) || ''
  const country = normalizeString(candidate.country) || ''
  const city = normalizeString(candidate.city) || ''
  const state = normalizeString(candidate.state) || ''

  return /india/i.test([location, country, city, state].join(' '))
}

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

const selectIndiaLocation = (job = {}) => {
  const candidates = [
    toLocationCandidate({ location: job.location, address: job.address }),
    ...(Array.isArray(job.secondaryLocations) ? job.secondaryLocations : []).map(toLocationCandidate),
  ].filter((candidate) => candidate.location)

  const indiaCandidates = filterIndiaJobs(candidates)
  return indiaCandidates.find(hasExplicitIndiaSignal) || indiaCandidates[0] || null
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

export const hasVerifiedCommunityPageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeString(rawHtml) || ''

  return /lilt/i.test(rawHtml)
    && normalized.includes('Shape the Future of Multilingual AI')
    && normalized.includes('Join our global network of language experts')
    && /Open Jobs|View all available positions that we are actively hiring for:/i.test(normalized)
    && normalized.includes('Visit https://jobs.ashbyhq.com/')
}

export const extractVerifiedAshbyPublicBoardUrl = (html = '') =>
  /https:\/\/jobs\.ashbyhq\.com\/lilt-production\b/i.test(String(html ?? ''))
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
        experienceRequired: extractAshbyExperienceRequired({
          title,
          jobDescription: normalizeString(job?.descriptionPlain ?? job?.descriptionHtml),
        }),
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

export const createLiltScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const communityHtml = await fetchText(COMMUNITY_PAGE_URL)
    if (!hasVerifiedCommunityPageSignal(communityHtml)) {
      throw new Error('Verified LILT community page changed materially')
    }

    const verifiedPublicBoardUrl = extractVerifiedAshbyPublicBoardUrl(communityHtml)
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

export const run = async (options = {}) => createLiltScraper(options).run(options)

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
