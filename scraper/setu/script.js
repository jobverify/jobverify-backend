import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { launchBrowser, createOptimizedPage } from '../utils/browser.js'
import { loadConfig } from '../utils/loadConfig.js'

import SETU_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SETU_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const VERIFIED_OPENING_TITLES = [
  'SDE - II Fullstack Engineer',
  'SDE - II Backend Engineer',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/â†—/g, '↗')
  .replace(/Â©/g, '©')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultRenderCareersPage = async (url) => {
  const browser = await launchBrowser()

  try {
    const page = await createOptimizedPage(browser)
    await page.setUserAgent(USER_AGENT)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 })
    await page.waitForSelector('main', { timeout: 15000 })
    await page.waitForFunction(
      () => document.body?.innerText?.includes('SDE - II Fullstack Engineer')
        || document.body?.innerText?.includes('SDE - II Backend Engineer')
        || !document.body?.innerText?.includes('Fetching open roles...'),
      { timeout: 15000 },
    )
    return page.content()
  } finally {
    await browser.close()
  }
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const title = (extractTitle(page) || '').toLowerCase()

  return title === 'careers at setu | join our fintech team'
    && text.includes("come tackle india's toughest fintech problems with an exceptional set of people.")
    && text.includes('we are completely overhauling our country\'s dated fintech architecture.')
    && text.includes('current openings')
    && text.includes('brokentusk technologies pvt. ltd')
}

export const hasPlaceholderOpeningsSignal = (html = '') =>
  /Fetching open roles/i.test(String(html ?? ''))

export const hasRenderableOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  return /Current openings/i.test(page)
    && VERIFIED_OPENING_TITLES.every((roleTitle) => page.includes(roleTitle))
  }

export const extractRenderedOpenings = (html = '') => {
  const listings = []
  const seenSlugs = new Set()

  for (const sectionMatch of String(html ?? '').matchAll(
    /<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3\b|$)/gi,
  )) {
    const groupDescription = normalizeWhitespace(sectionMatch[1])
    const sectionHtml = sectionMatch[2]

    for (const openingMatch of String(sectionHtml).matchAll(
      /<article\b[^>]*class=["'][^"']*\bopening\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi,
    )) {
      const articleHtml = openingMatch[1]
      const title = normalizeWhitespace(articleHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1])
      const slug = slugify(title)

      if (!title || !slug || seenSlugs.has(slug)) continue

      seenSlugs.add(slug)
      listings.push({
        slug,
        title,
        location: 'India',
        city: null,
        country: 'India',
        sourceUrl: `${CAREERS_URL}#${slug}`,
        applyUrl: `${CAREERS_URL}#${slug}`,
        jobDescription: groupDescription,
      })
    }
  }

  return listings
}

export const createSetuScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    renderCareersPage = defaultRenderCareersPage,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Setu careers page changed materially')
    }

    let openingsHtml = careersHtml
    if (!hasRenderableOpeningsSignal(openingsHtml)) {
      if (!hasPlaceholderOpeningsSignal(careersHtml)) {
        throw new Error('The rendered Setu openings no longer match the verified public surface')
      }

      openingsHtml = await renderCareersPage(CAREERS_URL)
    }

    if (!hasRenderableOpeningsSignal(openingsHtml)) {
      throw new Error('The rendered Setu openings no longer match the verified public surface')
    }

    const extractedJobs = extractRenderedOpenings(openingsHtml)
    if (extractedJobs.length === 0) {
      throw new Error('The rendered Setu openings did not expose any public jobs')
    }

    const limitedJobs = maxJobs ? extractedJobs.slice(0, maxJobs) : extractedJobs

    return limitedJobs.map((job) => ({
      title: job.title,
      company: COMPANY_NAME,
      department: null,
      location: job.location,
      city: job.city,
      country: job.country,
      jobId: job.slug,
      requisitionId: null,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: job.jobDescription,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createSetuScraper(options).run(options)

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
