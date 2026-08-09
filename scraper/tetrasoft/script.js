import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'tetrasoft'
export const COMPANY = 'TetraSoft'
export const HOMEPAGE_URL = 'https://www.tetrasoft.us/'
export const CAREERS_URL = 'https://www.tetrasoft.us/careers.html'
export const COMPANY_DOMAIN = 'tetrasoft.us'
export const APPLICATION_EMAIL = 'ts_tag_offshore@tetrasoft.us'
export const ATS_PLATFORM = 'official-company-careers-html'
export const VERIFIED_ON = '2026-07-18'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const HTML_ENTITY_MAP = {
  '&amp;': '&',
  '&apos;': "'",
  '&#39;': "'",
  '&#8217;': "'",
  '&quot;': '"',
  '&#8220;': '"',
  '&#8221;': '"',
  '&nbsp;': ' ',
}

const decodeHtmlEntities = (value) =>
  String(value ?? '').replace(
    /&(amp|apos|quot|nbsp);|&#39;|&#8217;|&#8220;|&#8221;/gi,
    (match) => HTML_ENTITY_MAP[match] || match,
  )

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) =>
  String(normalizeWhitespace(value) || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const toTitleCase = (value) =>
  String(value ?? '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())

const extractAll = (pattern, value, mapMatch) =>
  [...String(value ?? '').matchAll(pattern)].map((match) => mapMatch(match)).filter(Boolean)

const extractLabeledValue = (html, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return normalizeWhitespace(
    String(html ?? '').match(new RegExp(`<strong>\\s*${escapedLabel}\\s*:?\\s*<\\/strong>\\s*([^<]+)`, 'i'))?.[1],
  )
}

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: `${SOURCE}-html`,
    timeoutMs: 15000,
  })

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /Tetrasoft Careers/i.test(page)
    && /faq-item/i.test(page)
    && /mailto:ts_tag_offshore@tetrasoft\.us/i.test(page)
}

export const extractCareerCards = (html = '') =>
  extractAll(
    /<div\b[^>]*class=["'][^"']*faq-item[^"']*["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>?/gi,
    html,
    (match) => {
      const block = match[1]
      const title = normalizeWhitespace(
        block.match(/<div[^>]*class=["'][^"']*faq-header[^"']*["'][^>]*>[\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1],
      )
      if (!title) return null

      const skills = extractLabeledValue(block, 'Skills')
      const experienceRequired = extractLabeledValue(block, 'Experience')
      const rawLocation = extractLabeledValue(block, 'Location')
      const city = rawLocation ? toTitleCase(rawLocation) : null
      const location = city ? `${city}, India` : null
      const jobDescription = extractLabeledValue(block, 'Job Description')
      const slug = slugify(title)

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city,
        country: 'India',
        jobId: slug,
        requisitionId: slug,
        sourceUrl: `${CAREERS_URL}#${slug}`,
        applyUrl: `mailto:${APPLICATION_EMAIL}`,
        employmentType: null,
        experienceRequired,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: skills ? [skills] : [],
        postingDate: null,
        closingDate: null,
        jobDescription,
        salary: null,
      }
    },
  )

export const createTetrasoftScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: runNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified TetraSoft careers page no longer matches the trusted first-party accordion surface')
    }

    const cards = extractCareerCards(careersHtml)
    const limitedCards = Number.isInteger(maxJobs) ? cards.slice(0, maxJobs) : cards
    const scrapedAt = (runNow || now)()

    return limitedCards.map((job) => ({
      ...job,
      source: SOURCE,
      company: COMPANY,
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: ATS_PLATFORM,
      link: job.applyUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createTetrasoftScraper().run(options)

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
