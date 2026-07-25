import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kathirsudhirautomation'
export const COMPANY = 'Kathir Sudhir Automation'
export const HOMEPAGE_URL = 'https://www.kathirsudhirautomation.com/'
export const CAREERS_URL = 'https://www.kathirsudhirautomation.com/career'

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

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? '')).replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const cleanJobTitle = (value) => normalizeWhitespace(String(value ?? '').replace(/^\d+\.\s*Job Title:\s*/i, ''))

const extractTextAfterLabel = (blockHtml, label) => {
  const pattern = new RegExp(`${label}\\s*[:\\-]?\\s*<\\/p>\\s*<p>([\\s\\S]*?)<\\/p>`, 'i')
  return stripTags(pattern.exec(blockHtml)?.[1] || '')
}

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return /<title>\s*Kathir Sudhir Automation Solution_\s*Home\s*<\/title>/i.test(page)
    && /Kathir Sudhir Automation India Pvt Ltd/i.test(text)
    && /Electronics Instruments Manufacturer\s*&\s*System Integrator for Automation Solutions/i.test(text)
    && /href=["']\/career["'][^>]*>\s*Career\s*<\/a>/i.test(page)
    && /hr@kathirsudhirautomation\.com/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page).toLowerCase()

  return /<title>\s*Career opportunities in Electronics Core Company in Chennai\s*<\/title>/i.test(page)
    && text.includes('electronics core company jobs')
    && text.includes('sales & business development executive')
    && text.includes('graduate engineer trainee (get)')
    && text.includes('accounts & customer support executive')
    && text.includes('scm engineer & lead')
    && /hr@kathirsudhirautomation\.com/i.test(page)
}

const JOB_SECTION_PATTERN =
  /<section>\s*<h3>\s*([^<]+)\s*<\/h3>([\s\S]*?)<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*apply here\s*<\/a>\s*<\/section>/gi

export const extractPublicJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Kathir Sudhir Automation verified careers page no longer matches the known public first-party surface')
  }

  const jobs = [...String(html ?? '').matchAll(JOB_SECTION_PATTERN)].map((match) => {
    const rawTitle = match[1]
    const blockHtml = match[2]
    const applyUrl = buildAbsoluteUrl(match[3])
    const title = cleanJobTitle(rawTitle)
    const minimumQualification = extractTextAfterLabel(blockHtml, 'Qualifications') || null
    const experienceRequired = extractTextAfterLabel(blockHtml, 'Experience') || null
    const salary = extractTextAfterLabel(blockHtml, 'Salary range') || null
    const jobDescription = extractListItems(blockHtml).join(' ') || null
    const jobId = `${SOURCE}-${slugify(`${title}-chennai`)}`

    if (!title || !applyUrl || !jobDescription || !jobId) {
      throw new Error('Kathir Sudhir Automation verified careers job sections changed shape')
    }

    return {
      title,
      company: COMPANY,
      department: null,
      location: 'Chennai, Tamil Nadu, India',
      city: 'Chennai',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: `${CAREERS_URL}#${jobId}`,
      applyUrl,
      employmentType: null,
      experienceRequired,
      minimumQualification,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: salary ? `${jobDescription} Salary: ${salary}` : jobDescription,
    }
  })

  if (jobs.length !== 5) {
    throw new Error('Kathir Sudhir Automation verified careers job sections changed shape')
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

export const createKathirSudhirAutomationScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Kathir Sudhir Automation verified official homepage no longer matches the known first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = extractPublicJobs(careersHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'kathirsudhirautomation.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createKathirSudhirAutomationScraper().run(options)

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
