import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'techmaghi'
export const COMPANY = 'Techmaghi'
export const HOMEPAGE_URL = 'https://techmaghi.com/'
export const CAREERS_URL = 'https://techmaghi.com/career-2/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8212;|&mdash;/gi, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value, base = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, base).toString()
  } catch {
    return null
  }
}

const matchField = (description, label) => {
  const match = String(description ?? '').match(
    new RegExp(`${label}:\\s*([^\\n\\r]+)`, 'i'),
  )

  return normalizeWhitespace(match?.[1] ?? '')
}

const inferEmploymentType = (title, description) => {
  if (/\bintern\b/i.test(title) || /\bintern(ship)?\b/i.test(description)) {
    return 'Internship'
  }

  const explicitType = matchField(description, 'Employment Type') || matchField(description, 'Job Type')
  return explicitType || null
}

const inferWorkplaceType = (description) => {
  const locationValue = matchField(description, 'Location')
  if (!locationValue) return null
  if (/hybrid/i.test(locationValue)) return 'Hybrid'
  if (/remote/i.test(locationValue)) return 'Remote'
  if (/on[- ]site|office/i.test(locationValue)) return 'On-site'
  return null
}

const inferLocation = (description) => {
  const locationValue = matchField(description, 'Location')
  if (!locationValue) return 'India'
  if (/india/i.test(locationValue)) return locationValue
  return `${locationValue}, India`
}

const extractJobListHtml = (html) => {
  const match = String(html ?? '').match(
    /<div class="job-list">\s*<h3>Job Openings<\/h3>([\s\S]*?)<div class="job-details" id="job-details">/i,
  )

  if (!match) {
    throw new Error('Techmaghi careers page no longer exposes the verified job openings section')
  }

  return match[1]
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*TECHMAGHI\s*<\/title>/i.test(page)
    && /Explore the magic in technologies/i.test(text)
    && /info@techmaghi\.com/i.test(text)
    && /\+91\s*89212\s*38815/i.test(text)
    && /href=["']https?:\/\/techmaghi\.com\/career-2\/["']/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Careers\s*-\s*TECHMAGHI\s*<\/title>/i.test(page)
    && /Join Our Team/i.test(text)
    && /Choose from our extensive range of available roles!/i.test(text)
    && /Job Openings/i.test(text)
    && /Job Details/i.test(text)
    && /apply-now-btn/i.test(page)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Techmaghi careers page no longer matches the verified first-party jobs surface')
  }

  const jobListHtml = extractJobListHtml(html)
  const totalJobCardCount = [...jobListHtml.matchAll(/<div class="job-item">/gi)].length
  const closedJobCardCount = [...jobListHtml.matchAll(/class="job-closed"/gi)].length

  if (totalJobCardCount === 0) {
    throw new Error('Techmaghi careers page no longer exposes the verified job cards')
  }

  const jobs = Array.from(
    jobListHtml.matchAll(
      /<div class="job-item">[\s\S]*?<strong>([\s\S]*?)<\/strong>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<button class="apply-btn"[^>]+onclick="showDetails\(\s*'([^']*)'\s*,\s*\\?`([\s\S]*?)\\?`\s*,\s*'([^']+)'\s*\)"[^>]*>\s*Apply\s*<\/button>/gi,
    ),
    ([, rawTitle, rawTeaser, detailTitle, rawDescription, rawApplyUrl]) => {
      const title = stripTags(rawTitle) || normalizeWhitespace(detailTitle)
      const teaser = stripTags(rawTeaser)
      const structuredDescription = String(rawDescription ?? '')
      const jobDescription = normalizeWhitespace(structuredDescription)
      const applyUrl = toAbsoluteUrl(rawApplyUrl, CAREERS_URL)
      const workplaceType = inferWorkplaceType(structuredDescription)
      const location = inferLocation(structuredDescription)
      const compensation = matchField(structuredDescription, 'Stipend') || matchField(structuredDescription, 'Compensation') || null
      const jobSlug = slugify(title)

      if (!title || !teaser || !jobDescription || !applyUrl || !jobSlug) {
        throw new Error('Techmaghi careers job cards changed shape')
      }

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city: null,
        country: 'India',
        jobId: `${SOURCE}-${jobSlug}`,
        requisitionId: `${SOURCE}-${jobSlug}`,
        sourceUrl: CAREERS_URL,
        applyUrl,
        employmentType: inferEmploymentType(title, structuredDescription),
        workplaceType,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation,
        postingDate: null,
        closingDate: null,
        jobDescription,
      }
    },
  )

  if (jobs.length === 0) {
    throw new Error('Techmaghi careers page no longer exposes any open jobs in the verified card format')
  }

  if (jobs.length + closedJobCardCount !== totalJobCardCount) {
    throw new Error('Techmaghi careers job cards changed shape')
  }

  return jobs.sort((left, right) => left.title.localeCompare(right.title))
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createTechmaghiScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Techmaghi homepage no longer matches the verified first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'techmaghi.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createTechmaghiScraper().run(options)

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
