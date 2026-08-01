import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'dineshchandraragrawalinfracon'
export const COMPANY = 'Dineshchandra R. Agrawal Infracon Private Limited'
export const HOMEPAGE_URL = 'https://www.draipl.com/'
export const CAREERS_URL = 'https://www.draipl.com/careers.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_ERROR =
  'DRA Infracon verified official homepage no longer matches the trusted first-party surface'
const CAREERS_ERROR =
  'DRA Infracon verified public careers page no longer matches the verified first-party page with public job openings'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&#8211;|&#x2013;/gi, '-')
  .replace(/&mdash;|&#8212;|&#x2014;/gi, '-')
  .replace(/[–—]/g, '-')
  .replace(/[â€“â€”]/g, '-')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeOptionalField = (value) => {
  const normalized = normalizeWhitespace(value)
  return normalized === '-' ? null : normalized
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '').replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const countMatches = (value, pattern) => [...String(value ?? '').matchAll(pattern)].length

const htmlToLines = (html) => decodeHtml(
  String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|li|h[1-6]|option|button|a|select)>/gi, '\n')
    .replace(/<(p|div|section|li|h[1-6]|option|button|a|select)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' '),
)
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => line.replace(/\s+/g, ' ').trim())
  .filter(Boolean)

const normalizeLocationString = (value) => {
  const normalized = normalizeOptionalField(value)
  return normalized ? normalized.replace(/\s*-\s*/g, ' - ') : null
}

const parseLocation = (value) => {
  const location = normalizeLocationString(value)
  if (!location) {
    return { location: null, city: null, state: null }
  }

  if (/^head office$/i.test(location)) {
    return { location, city: null, state: null }
  }

  const parts = location.split(/\s+-\s+/)
  if (parts.length === 2) {
    const [first, second] = parts.map((part) => normalizeWhitespace(part))

    if (/^[a-z .]+$/i.test(first || '') && /^[a-z .]+$/i.test(second || '')) {
      return { location: `${first} - ${second}`, city: first, state: second }
    }

    if (/project/i.test(second || '') && /^[a-z .]+$/i.test(first || '')) {
      return { location: `${first} - ${second}`, city: first, state: null }
    }
  }

  if (/^[a-z .]+$/i.test(location)) {
    return { location, city: location, state: null }
  }

  return { location, city: null, state: null }
}

const extractPositionsFromApplyForm = (html) => {
  const selectHtml = String(html ?? '').match(/<select\b[^>]*>([\s\S]*?)<\/select>/i)?.[1]
  if (!selectHtml) {
    throw new Error(CAREERS_ERROR)
  }

  return [...selectHtml.matchAll(/<option[^>]*>([\s\S]*?)<\/option>/gi)]
    .map((match) => normalizeOptionalField(stripTags(match[1])))
    .filter((value) => value && !/^select position$/i.test(value))
}

const extractListingLines = (html) => {
  const lines = htmlToLines(html)
  const startIndex = lines.findIndex((line) =>
    /^Currently,\s*we are looking for applicants for the following positions\.$/i.test(line),
  )
  const endIndex = lines.findIndex((line) => /^Please fill your Details$/i.test(line))

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error(CAREERS_ERROR)
  }

  return lines.slice(startIndex + 1, endIndex)
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /DINESHCHANDRA R\. AGRAWAL INFRACON PVT\. LTD\./i.test(text)
    && /Dineshchandra R\. Agrawal Infracon Private Limited, which has been operating successfully over five decades/i.test(text)
    && /The fundamental premise of the Company is built on integrity, commitment to quality and excellence/i.test(text)
    && /href=["']https:\/\/www\.draipl\.com\/careers\.html["']/i.test(page)
    && /info@draipl\.com/i.test(text)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title>\s*DRA\s*\|\s*We build future\s*-\s*Dineshchandra R\.\s*Agrawal Infracon Pvt\.\s*Ltd\.\s*<\/title>/i.test(page)
    && /<h1>\s*Careers\s*<\/h1>/i.test(page)
    && /Currently,\s*we are looking for applicants for the following positions\./i.test(text)
    && /Please fill your Details/i.test(text)
    && /Upload Your Resume/i.test(text)
    && countMatches(page, />\s*Apply Now\s*</gi) >= 15
    && countMatches(page, /<option\b/gi) >= 16
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error(CAREERS_ERROR)
  }

  const lines = extractListingLines(html)
  const formTitles = extractPositionsFromApplyForm(html)
  const jobs = []

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^Position:\s*/i.test(lines[index])) continue

    const title = normalizeOptionalField(lines[index].replace(/^Position:\s*/i, ''))
    const experienceLine = lines[index + 1]
    const locationLine = lines[index + 2]
    const descriptionLine = lines[index + 3]
    const applyLine = lines[index + 4]

    if (
      !title
      || !/^Experience:\s*/i.test(experienceLine || '')
      || !/^Location:\s*/i.test(locationLine || '')
      || !/^Description:\s*/i.test(descriptionLine || '')
      || !/^Apply Now$/i.test(applyLine || '')
    ) {
      throw new Error(CAREERS_ERROR)
    }

    const locationFields = parseLocation(locationLine.replace(/^Location:\s*/i, ''))
    const jobId = `${SOURCE}-${slugify(title)}`

    if (!jobId) {
      throw new Error(CAREERS_ERROR)
    }

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: locationFields.location,
      city: locationFields.city,
      state: locationFields.state,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: null,
      experienceRequired: normalizeOptionalField(experienceLine.replace(/^Experience:\s*/i, '')),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeOptionalField(descriptionLine.replace(/^Description:\s*/i, '')),
    })

    index += 4
  }

  if (jobs.length === 0 || jobs.length !== formTitles.length) {
    throw new Error(CAREERS_ERROR)
  }

  const jobTitles = jobs.map((job) => job.title)
  if (jobTitles.some((title, index) => title !== formTitles[index])) {
    throw new Error(CAREERS_ERROR)
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createDineshchandraRAgrawalInfraconScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error(HOMEPAGE_ERROR)
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicListings(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'draipl.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createDineshchandraRAgrawalInfraconScraper().run(options)

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
