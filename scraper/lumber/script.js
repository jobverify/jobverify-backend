import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lumber'
export const COMPANY = 'Lumber'
export const HOMEPAGE_URL = 'https://www.lumber.com/'
export const CAREERS_URL = 'https://www.lumber.com/careers'
export const BOARD_URL = 'https://americaninternationalforestproductsllc.applytojob.com/apply'

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
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? '')).replace(/<[^>]+>/g, ' '),
)

const stripTagsToLines = (value) => String(value ?? '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/ul|\/ol)\b[^>]*>/gi, '\n')
  .replace(/<li\b[^>]*>/gi, '\n')
  .replace(/<p\b[^>]*>/gi, '\n')
  .replace(/<tr\b[^>]*>/gi, '\n')
  .replace(/<td\b[^>]*>/gi, ' ')
  .replace(/<th\b[^>]*>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .split('\n')
  .map((line) => stripTags(line))
  .filter(Boolean)

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const parseLocation = (value) => {
  const location = normalizeWhitespace(value)
  if (!location) return { location: null, city: null }

  const city = normalizeWhitespace(location.split(',')[0]) || null
  return { location, city }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Home\s*\|\s*American International/i.test(page)
    && /America's leading trader of lumber and building materials/i.test(text)
    && /Where materials build momentum\./i.test(text)
    && /American International Forest Products \(AIFP\)/i.test(text)
    && /<a[^>]+href=["']\/careers["'][^>]*>\s*Careers\s*<\/a>/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Careers\s*\|\s*American International/i.test(page)
    && /Thank you for your interest in AIFP!/i.test(text)
    && /Current Openings/i.test(text)
    && /View Our Website/i.test(text)
    && /Powered by/i.test(text)
    && /americaninternationalforestproductsllc\.applytojob\.com\/apply/i.test(page)
}

export const hasVerifiedBoardSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*American International Forest Products, LLC\.\s*-\s*Career Page/i.test(page)
    && /Current Openings/i.test(text)
    && /View Our Website/i.test(text)
    && /Powered by/i.test(text)
}

export const hasVerifiedJobDetailSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Rookie Trader - Sales Trainee\s*-\s*American International Forest Products, LLC\.\s*-\s*Career Page/i.test(page)
    && /Rookie Trader - Sales Trainee/i.test(text)
    && /Portland, OR/i.test(text)
    && /Full Time/i.test(text)
    && /Entry Level/i.test(text)
    && /Kickstart Your Career in Commodity Trading/i.test(text)
}

export const extractBoardJobs = (html) => {
  if (!hasVerifiedBoardSignal(html)) {
    throw new Error('Lumber verified applytojob board no longer matches the known public surface')
  }

  const source = String(html ?? '')
  const sectionStart = source.indexOf('<h2>Current Openings</h2>')
  const sectionEnd = source.indexOf('Powered by')
  if (sectionStart < 0 || sectionEnd < 0 || sectionEnd <= sectionStart) {
    throw new Error('Lumber verified applytojob board no longer exposes the current openings section')
  }

  const sectionHtml = source.slice(sectionStart, sectionEnd)
  const jobs = []

  for (const match of sectionHtml.matchAll(
    /<li>\s*<h3><a href="([^"]+)">([\s\S]*?)<\/a><\/h3>\s*<div>([\s\S]*?)<\/div>\s*<\/li>/gi,
  )) {
    const detailUrl = toAbsoluteUrl(match[1], BOARD_URL)
    const title = stripTags(match[2])
    const { location, city } = parseLocation(match[3])
    const jobId = detailUrl ? new URL(detailUrl).pathname.split('/').filter(Boolean)[1] || null : null

    if (!detailUrl || !title || !location || !jobId) {
      continue
    }

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location,
      city,
      country: 'United States',
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    })
  }

  return jobs
}

export const extractJobDetail = (html, expectedTitle = null) => {
  if (!hasVerifiedJobDetailSignal(html)) {
    throw new Error('Lumber verified job detail page no longer matches the known public surface')
  }

  const page = String(html ?? '')
  const lines = stripTagsToLines(page)
  const title = normalizeWhitespace(expectedTitle || lines.find((line) => /Rookie Trader - Sales Trainee/i.test(line)) || null)
  const titleIndex = title ? lines.findIndex((line) => line.toLowerCase() === title.toLowerCase()) : -1
  const detailLines = titleIndex >= 0 ? lines.slice(titleIndex + 1) : lines
  const location = detailLines[0] || null
  const employmentType = detailLines[1] || null
  const experienceRequired = detailLines[2] || null
  const descriptionStart = lines.findIndex((line) => /Kickstart Your Career in Commodity Trading/i.test(line))
  const descriptionEnd = lines.findIndex((line) => /Apply today and discover where your ambition can take you\./i.test(line))
  const descriptionLines = lines.slice(
    descriptionStart >= 0 ? descriptionStart : 0,
    descriptionEnd >= 0 ? descriptionEnd + 1 : undefined,
  )
  const description = normalizeWhitespace(descriptionLines.join(' '))

  return {
    title,
    location,
    city: parseLocation(location).city,
    employmentType,
    experienceRequired,
    jobDescription: description,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createLumberScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Lumber verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Lumber verified first-party careers page no longer matches the known public surface')
    }

    const boardHtml = await fetchText(BOARD_URL)
    const boardJobs = extractBoardJobs(boardHtml)

    const jobs = []
    for (const job of boardJobs) {
      const detailHtml = await fetchText(job.sourceUrl)
      const detail = extractJobDetail(detailHtml, job.title)

      jobs.push({
        ...job,
        ...detail,
        source: SOURCE,
        company: COMPANY,
        link: job.applyUrl,
        scrapedAt: (overrideNow || now)(),
        companyCareerPage: CAREERS_URL,
        companyDomain: 'lumber.com',
        atsPlatform: 'official-careers-page-plus-applytojob-board',
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createLumberScraper().run(options)

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
