import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lakshya'
export const COMPANY = 'Lakshya'
export const HOMEPAGE_URL = 'https://lakshyadigital.com/'
export const CAREERS_URL = 'https://lakshyadigital.com/careers/'
export const WORKABLE_BOARD_URL = 'https://apply.workable.com/lakshyadigitalglobal'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? '')).replace(/<[^>]+>/g, ' '),
)

const parseLocation = (value) => {
  const parts = normalizeWhitespace(value)
    .split(',')
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  return {
    location: parts.join(', ') || null,
    city: parts[0] || null,
    state: parts.length >= 3 ? parts[1] : null,
    country: parts.at(-1) || null,
  }
}

const isIndiaLocation = (value) => /(^|[\s,(])india($|[\s,).])/i.test(String(value ?? ''))

const extractJobId = (url) => {
  try {
    const pathnameParts = new URL(url).pathname.split('/').filter(Boolean)
    return pathnameParts.at(-1)?.toUpperCase() || null
  } catch {
    return null
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Lakshya Digital/i.test(page)
    && /GAME ART EXCELLENCE/i.test(text)
    && /Founded in 2004,\s*Lakshya Digital is India.?s largest art outsourcing studio/i.test(text)
    && /<a[^>]+href=["']https:\/\/lakshyadigital\.com\/careers\/["'][^>]*>\s*Careers\s*<\/a>/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Careers\s*-\s*Lakshya Digital\s*<\/title>/i.test(page)
    && /Join Lakshya/i.test(text)
    && /Browse Current Openings/i.test(text)
    && /id=["']jobList["']/i.test(page)
    && page.includes(WORKABLE_BOARD_URL)
}

const JOB_LIST_PATTERN = /<ul class="career-job-list" id="jobList">([\s\S]*?)<\/ul>/i
const JOB_CARD_PATTERN =
  /<li>\s*<a[^>]+href="(https:\/\/apply\.workable\.com\/j\/[A-Z0-9]+)"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<h4>([^<]+)<\/h4>[\s\S]*?<p>([^<]+)<\/p>[\s\S]*?<\/a>\s*<\/li>/gi
const JOB_LINK_PATTERN = /<li>\s*<a[^>]+href="https:\/\/apply\.workable\.com\/j\/[A-Z0-9]+"[^>]*>/gi

const buildEmploymentType = (title) => {
  const normalizedTitle = normalizeWhitespace(title)
  if (/internship|intern\b/i.test(normalizedTitle)) return 'Internship'
  if (/\bcontract\b/i.test(normalizedTitle)) return 'Contract'
  return null
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Lakshya verified first-party careers page no longer matches the known public shell')
  }

  const page = String(html ?? '')
  const jobListMatch = page.match(JOB_LIST_PATTERN)
  if (!jobListMatch) {
    throw new Error('Lakshya verified careers job list is missing from the first-party page')
  }

  const jobListHtml = jobListMatch[1]
  const visibleJobLinkCount = [...jobListHtml.matchAll(JOB_LINK_PATTERN)].length
  const visibleCards = [...jobListHtml.matchAll(JOB_CARD_PATTERN)].map((match) => {
    const [, rawUrl, rawWorkplaceType, rawTitle, rawLocation] = match
    const title = stripTags(rawTitle)
    const locationBits = parseLocation(rawLocation)
    const workplaceType = stripTags(rawWorkplaceType)
    const jobId = extractJobId(rawUrl)

    if (!title || !locationBits.location || !workplaceType || !jobId) {
      throw new Error('Lakshya verified careers job cards changed shape')
    }

    return {
      title,
      company: COMPANY,
      ...locationBits,
      jobId,
      requisitionId: jobId,
      sourceUrl: rawUrl,
      applyUrl: rawUrl,
      department: null,
      employmentType: buildEmploymentType(title),
      workplaceType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })

  if (visibleJobLinkCount === 0) {
    if (/\b(no current openings|no open positions)\b/i.test(stripTags(jobListHtml))) {
      return []
    }

    throw new Error('Lakshya verified careers job list no longer exposes public openings')
  }

  if (visibleCards.length !== visibleJobLinkCount) {
    throw new Error('Lakshya verified careers job cards changed shape')
  }

  return visibleCards
    .filter((job) => isIndiaLocation(job.location))
    .sort((left, right) =>
      left.title.localeCompare(right.title) || left.jobId.localeCompare(right.jobId),
    )
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createLakshyaScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Lakshya verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'lakshyadigital.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createLakshyaScraper().run(options)

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
