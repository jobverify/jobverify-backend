import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AMTEX_SYSTEMS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = AMTEX_SYSTEMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const INDIA_LOCATION_PATTERN = /\b(india|hyderabad|bengaluru|bangalore|mumbai|pune|chennai|gurugram|gurgaon|noida|delhi)\b/i

const normalizeWhitespace = (value = '') => String(value)
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, baseUrl = HOMEPAGE_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const isIndiaLocation = (value) => INDIA_LOCATION_PATTERN.test(normalizeWhitespace(value))

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html)
  return /Join Our Team/i.test(page)
    && /Position Applying For/i.test(page)
    && /href=["']\/career-list\/business-analyst["']/i.test(page)
}

export const extractRealCareerLinks = (html = '') => {
  const page = String(html)
  const hrefPattern = /<a[^>]+class=["']tiles3A randomise["'][^>]+href=["']([^"']+)["']/gi
  const links = []

  for (const match of page.matchAll(hrefPattern)) {
    const href = normalizeWhitespace(match[1])
    if (!href || href === '#') continue
    const absoluteUrl = toAbsoluteUrl(href)
    if (absoluteUrl) links.push(absoluteUrl)
  }

  return [...new Set(links)]
}

const parseJobDetailPage = (html = '', sourceUrl) => {
  const titleMatch = String(html).match(/<h2 class=["']amtex-form-title["']>\s*Apply for\s*([^<]+?)\s*<\/h2>/i)
  const locationMatch = String(html).match(/<p class=["']amtex-form-subtitle["']>\s*Join our team in\s*([^<]+?)\s*<\/p>/i)

  const title = normalizeWhitespace(titleMatch?.[1])
  const location = normalizeWhitespace(locationMatch?.[1])
  if (!title || !location || !isIndiaLocation(location)) return null

  return {
    title,
    location,
    city: null,
    state: null,
    country: 'India',
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    remoteStatus: null,
    jobDescription: `Official Amtex Systems detail-page opening for ${title}. Verified first-party location: ${location}.`,
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

export const createAmtexSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Amtex Systems verified careers page no longer matches the trusted first-party shell')
    }

    const detailLinks = extractRealCareerLinks(careersHtml)
    if (detailLinks.length === 0) {
      throw new Error('Amtex Systems careers page no longer exposes the verified first-party detail links')
    }

    const jobs = []
    for (const detailUrl of detailLinks) {
      const detailHtml = await fetchText(detailUrl)
      const job = parseJobDetailPage(detailHtml, detailUrl)
      if (!job) continue
      jobs.push({
        ...job,
        company: COMPANY,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
      })
    }

    return jobs.sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createAmtexSystemsScraper().run(options)

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
