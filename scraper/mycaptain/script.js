import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mycaptain'
export const COMPANY = 'MyCaptain'
export const HOMEPAGE_URL = 'https://mycaptain.in/'
export const CAREER_URL = 'https://mycaptain.in/career'

const COMPANY_DOMAIN = 'mycaptain.in'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&quot;/gi, '"')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const countMatches = (value, pattern) => [...String(value ?? '').matchAll(pattern)].length

const parseNextData = (html) => {
  const match = String(html ?? '').match(
    /<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i,
  )

  if (!match) return null

  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*MyCaptain - E-Learning Platform with Job Ready &amp; Certification Programs\s*<\/title>/i.test(page)
    && /Transform your Career with/i.test(text)
    && /3,80,000\+\s+learners already have!/i.test(text)
    && /\bHiring Partners\b/i.test(text)
    && /https:\/\/app\.mycaptain\.in\//i.test(page)
    && /Imarticus Learning Pvt Ltd/i.test(text)
}

export const hasOfficialCareerPageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)
  const nextData = parseNextData(page)

  return nextData?.page === '/career'
    && /scripts\.zipteams\.com\/v2\.0\/index\.js/i.test(page)
    && /Join us in creating an Impact/i.test(text)
    && /See Current Openings/i.test(text)
    && /Current Job Openings/i.test(text)
    && /placeholder=["']Search by job role["']/i.test(page)
    && /All departments \(\d+\)/i.test(text)
    && /linkedin\.com\/company\/mycaptain-in\//i.test(page)
    && /Imarticus Learning Pvt Ltd/i.test(text)
}

const ZERO_JOBS_PATTERN = /\b(no current openings|no open positions|no jobs available|check back later)\b/i
const JOB_CARD_START_PATTERN = /<div class="jobOpenings_jobCards__[A-Za-z0-9_]+ card">/gi

const extractCardSegments = (html) => {
  const page = String(html ?? '')
  const startIndexes = [...page.matchAll(JOB_CARD_START_PATTERN)]
    .map((match) => match.index)
    .filter((index) => Number.isInteger(index))

  if (startIndexes.length === 0) return []

  return startIndexes.map((startIndex, index) => {
    const endIndex = index + 1 < startIndexes.length
      ? startIndexes[index + 1]
      : page.indexOf('<div class="footer_footerContainer', startIndex)

    return page.slice(startIndex, endIndex > startIndex ? endIndex : undefined)
  })
}

const extractTitle = (segmentHtml) => normalizeWhitespace(
  segmentHtml.match(/<div class="jobOpenings_jobTitle__[A-Za-z0-9_]+ card-title h5">([\s\S]*?)<\/div>/i)?.[1],
)

const extractLocation = (segmentHtml) => stripTags(
  segmentHtml.match(/<p[^>]*class="nextImageBlock card-text"[^>]*>([\s\S]*?)<\/p>/i)?.[1],
)

export const extractInlineJobCards = (html) => {
  if (!hasOfficialCareerPageSignal(html)) {
    throw new Error('MyCaptain verified first-party /career page no longer matches the known public shell')
  }

  const segments = extractCardSegments(html)

  if (segments.length === 0) {
    if (ZERO_JOBS_PATTERN.test(stripTags(html))) {
      return []
    }

    throw new Error('MyCaptain verified first-party /career page no longer exposes inline job cards')
  }

  const jobCounts = new Map()

  return segments.map((segmentHtml) => {
    const title = extractTitle(segmentHtml)
    const location = extractLocation(segmentHtml)

    if (!title || !location) {
      throw new Error('MyCaptain verified first-party /career page inline job cards changed shape')
    }

    const city = normalizeWhitespace(location.split(',')[0]) || location
    const baseSlug = slugify(`${title}-${location}`)
    const seenCount = (jobCounts.get(baseSlug) ?? 0) + 1
    jobCounts.set(baseSlug, seenCount)

    const jobId = `${SOURCE}-${baseSlug}${seenCount > 1 ? `-${seenCount}` : ''}`

    return {
      title,
      company: COMPANY,
      location,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREER_URL,
      applyUrl: null,
      department: null,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
    }
  })
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createMyCaptainScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('MyCaptain verified official homepage no longer matches the known first-party surface')
    }

    const careerHtml = await fetchText(CAREER_URL)
    const jobs = extractInlineJobCards(careerHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREER_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createMyCaptainScraper().run(options)

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
