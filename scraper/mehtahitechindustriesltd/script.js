import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mehtahitechindustriesltd'
export const COMPANY = 'Mehta Hitech Industries Ltd.'
export const HOMEPAGE_URL = 'https://www.mehtahitech.com/'
export const CAREERS_URL = 'https://www.mehtahitech.com/jobs.html'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const absoluteUrl = (value) => {
  if (!value) return null

  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const extractFieldBlock = (sectionHtml, label) => sectionHtml.match(
  new RegExp(`<dt[^>]*>\\s*${label}\\s*<\\/dt>([\\s\\S]*?)(?=<dt[^>]*>|<\\/dl>|$)`, 'i'),
)?.[1] || ''

const parseFieldValue = (sectionHtml, label) => normalizeWhitespace(
  extractFieldBlock(sectionHtml, label).match(/<dd[^>]*>([\s\S]*?)<\/dd>/i)?.[1],
)

const parseAllFieldValues = (sectionHtml, label) => [...extractFieldBlock(sectionHtml, label).matchAll(
  /<dd[^>]*>([\s\S]*?)<\/dd>/gi,
)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const joinUnique = (values) => [...new Set(values.map((value) => normalizeWhitespace(value)).filter(Boolean))].join(', ')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Mehta Hitech Industries Limited - Manufacturer of Fiber Laser Cutting Machine from Ahmedabad\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*Mehta Hitech Industries Limited\s*<\/h1>/i.test(page)
    && /href=["']\/jobs\.html["']/i.test(page)
    && /Career Opportunities/i.test(page)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Career Opportunities at Mehta Hitech Industries Limited\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*Career Opportunities\s*<\/h1>/i.test(page)
    && /Marketing Executives/i.test(page)
    && /Job Application Form/i.test(page)
    && /Apply Now/i.test(page)
    && /Qualification/i.test(page)
    && /Skills Required/i.test(page)
    && /Experience/i.test(page)
}

export const extractPublicListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Mehta Hitech Industries Ltd. verified careers surface changed or disappeared')
  }

  const page = String(html ?? '')
  const openingHtml = page.match(/<section\b[^>]*class=["'][^"']*\bcareer-opening\b[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1]

  if (!openingHtml) {
    throw new Error('Mehta Hitech Industries Ltd. verified careers surface changed or disappeared')
  }

  const title = stripTags(openingHtml.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1])
  const summary = stripTags(openingHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1])
  const qualification = parseFieldValue(openingHtml, 'Qualification')
  const skills = parseAllFieldValues(openingHtml, 'Skills Required')
  const experienceRequired = parseFieldValue(openingHtml, 'Experience')
  const applyUrl = absoluteUrl(openingHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]) || CAREERS_URL
  const location = 'Ahmedabad, Gujarat, India'
  const city = 'Ahmedabad'
  const jobSlug = slugify(title)
  const jobId = `${SOURCE}-${jobSlug}`

  if (!title || !summary || !qualification || !experienceRequired || skills.length === 0) {
    throw new Error('Mehta Hitech Industries Ltd. verified careers surface changed or disappeared')
  }

  return [{
    title,
    company: COMPANY,
    department: 'Marketing',
    location,
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: `${CAREERS_URL}#${jobId}`,
    applyUrl,
    employmentType: null,
    experienceRequired,
    minimumQualification: qualification,
    preferredQualification: joinUnique(skills),
    requiredSkills: skills,
    postingDate: null,
    closingDate: null,
    jobDescription: [
      `Company: ${COMPANY}`,
      `Location: ${city}`,
      `Qualification: ${qualification}`,
      `Year of experience: ${experienceRequired}`,
      `Notes: ${summary}`,
    ].join(' | '),
  }]
}

export const createMehtaHitechIndustriesLtdScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Mehta Hitech Industries Ltd. verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    return extractPublicListings(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
      companyCareerPage: CAREERS_URL,
      companyDomain: 'mehtahitech.com',
      atsPlatform: 'official-company-careers',
    }))
  },
})

export const run = async (options = {}) => createMehtaHitechIndustriesLtdScraper().run(options)

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
