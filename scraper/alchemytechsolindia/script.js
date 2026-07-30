import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createOptimizedPage, launchBrowser } from '../utils/browser.js'
import { normalizeCity } from '../utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://alchemytechsol.com/career/'
export const LEGACY_CAREERS_URL = 'https://www.alchemytechsol.com/eng/careernew.html'

const SOURCE = 'alchemytechsolindia'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#8211;|&ndash;|&#8212;|&mdash;/gi, '-')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\u00a0/g, ' ')
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const stripHtmlComments = (html = '') => String(html ?? '').replace(/<!--[\s\S]*?-->/g, '')

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value, baseUrl) => {
  try {
    return new URL(String(value ?? ''), baseUrl).toString()
  } catch {
    return null
  }
}

export const pageIndicatesOfficialCareersSurface = (html) => {
  const page = String(html ?? '')
  return (
    /Join Our Team/i.test(page)
    && /Build Your Future with Alchemy Techsol/i.test(page)
    && /Current Openings/i.test(page)
    && (/View Position/i.test(page) || /JavaScript must be enabled in order to view listings/i.test(page))
  )
}

export const extractCurrentOpenings = (html) => {
  if (!pageIndicatesOfficialCareersSurface(html)) {
    throw new Error('Alchemy Techsol careers page no longer matches the verified official careers surface')
  }

  const currentOpeningsSection = String(html ?? '').split(/<h1[^>]*>\s*Current Openings\s*<\/h1>/i)[1] || ''

  return [...currentOpeningsSection.matchAll(
    /<h2[^>]*>\s*([^<]+?)\s*<\/h2>[\s\S]*?<p>\s*([^<]+?)\s*<\/p>[\s\S]*?<p>\s*Location:\s*([^<]+?)\s*<\/p>[\s\S]*?(?:View Position|<span>\s*View Position\s*<\/span>)/gi,
  )]
    .map((match) => ({
      title: normalizeWhitespace(match[1]),
      description: normalizeWhitespace(match[2]),
      location: normalizeWhitespace(match[3]),
    }))
    .filter((job) => job.title && job.location)
}

const isIndiaOpening = (opening) => /india|bengaluru|bangalore|pune|hyderabad|gurgaon|gurugram|mumbai|chennai|noida|delhi/i
  .test(`${opening?.location || ''}`)

export const extractLegacyCategoryUrls = (html = '') => {
  const page = stripHtmlComments(html)
  const urls = [...page.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>[\s\S]*?open positions?/gi)]
    .map((match) => toAbsoluteUrl(match[1], LEGACY_CAREERS_URL))
    .filter(Boolean)
    .filter((url) => /\/eng\/career\/[^/]+\/[^/]+\.html$/i.test(url))
    .filter((url) => !/details\.html$/i.test(url))

  return [...new Set(urls)]
}

export const extractLegacyCategoryOpenings = (html = '', categoryUrl = LEGACY_CAREERS_URL) => {
  const page = stripHtmlComments(html)

  return [...page.matchAll(
    /<h5[^>]*>([\s\S]*?)<\/h5>[\s\S]*?<i\b[^>]*fa-map-marker-alt[^>]*>\s*<\/i>\s*([^<]+)[\s\S]*?<i\b[^>]*far\s+fa-clock[^>]*>\s*<\/i>\s*([^<]+)[\s\S]*?<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply Now/gi,
  )]
    .map((match) => ({
      title: stripTags(match[1]),
      location: normalizeWhitespace(match[2]),
      employmentType: normalizeWhitespace(match[3]),
      applyUrl: toAbsoluteUrl(match[4], categoryUrl),
      categoryUrl,
    }))
    .filter((job) => job.title && job.location && job.applyUrl)
}

const normalizeLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/\bIndia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const normalizeOpening = (opening, { now }) => {
  const title = normalizeWhitespace(opening.title)
  const rawLocation = normalizeWhitespace(opening.location)
  const location = normalizeLocation(rawLocation)
  const city = normalizeCity(rawLocation?.split(',')[0]?.trim())
  const jobSlug = slugify(`${title}-${rawLocation}`)
  if (!title || !rawLocation || !location || !city || !jobSlug) return null

  const sourceUrl = opening.categoryUrl || CAREERS_URL
  const applyUrl = opening.applyUrl || sourceUrl

  return {
    title,
    company: 'Alchemy Techsol India Pvt Ltd',
    department: null,
    location,
    city,
    country: 'India',
    jobId: `${SOURCE}-${jobSlug}`,
    requisitionId: `${SOURCE}-${jobSlug}`,
    sourceUrl,
    applyUrl,
    employmentType: normalizeWhitespace(opening.employmentType),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(opening.description),
    remoteStatus: /remote/i.test(rawLocation) ? 'Remote' : 'On-site',
    source: SOURCE,
    link: applyUrl,
    scrapedAt: now(),
  }
}

const createBrowserTextFetcher = async ({
  launchBrowserImpl = launchBrowser,
  createOptimizedPageImpl = createOptimizedPage,
} = {}) => {
  const browser = await launchBrowserImpl()

  try {
    const page = await createOptimizedPageImpl(browser)

    return {
      close: async () => browser.close(),
      fetchText: async (url) => {
        const response = await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        })

        if (!response?.ok()) {
          throw new Error(`HTTP ${response?.status?.() ?? 'unknown'} for ${url}`)
        }

        return page.content()
      },
    }
  } catch (error) {
    await browser.close()
    throw error
  }
}

export const createAlchemyTechsolIndiaScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText } = {}) {
    let browserContext = null

    try {
      if (!fetchText) {
        browserContext = await createBrowserTextFetcher()
        fetchText = browserContext.fetchText
      }

      const html = await fetchText(CAREERS_URL)
      const openings = extractCurrentOpenings(html)
      const legacyHtml = await fetchText(LEGACY_CAREERS_URL)
      const legacyIndicatesOfficialCareersSurface = pageIndicatesOfficialCareersSurface(legacyHtml)
      const categoryUrls = extractLegacyCategoryUrls(legacyHtml)
      if (categoryUrls.length === 0 && openings.length === 0 && !legacyIndicatesOfficialCareersSurface) {
        throw new Error('Alchemy Techsol legacy careers surface no longer exposes category job links')
      }

      const legacyOpenings = []
      for (const categoryUrl of categoryUrls) {
        const categoryHtml = await fetchText(categoryUrl)
        legacyOpenings.push(...extractLegacyCategoryOpenings(categoryHtml, categoryUrl))
      }

      const seenJobIds = new Set()

      return [...openings, ...legacyOpenings]
        .filter((opening) => isIndiaOpening(opening))
        .map((opening) => normalizeOpening(opening, { now }))
        .filter((job) => job && !seenJobIds.has(job.jobId) && seenJobIds.add(job.jobId))
    } finally {
      if (browserContext) {
        await browserContext.close()
      }
    }
  },
})

export const run = async (options = {}) => createAlchemyTechsolIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Alchemy Techsol India jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
