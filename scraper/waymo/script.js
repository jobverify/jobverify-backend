import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { attachInventoryEvidence } from '../../scraper-support/utils/inventoryEvidence.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'waymo'
export const COMPANY = 'Waymo'
export const FIRST_PARTY_ROOT_URL = 'https://careers.withwaymo.com/jobs/search'
export const INDIA_COUNTRY_CODE = 'IN'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const buildIndiaSearchUrl = () => {
  const url = new URL(FIRST_PARTY_ROOT_URL)
  url.searchParams.append('country_codes[]', INDIA_COUNTRY_CODE)
  return url.toString()
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(String(value ?? ''))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const toAbsoluteUrl = (value, baseUrl = FIRST_PARTY_ROOT_URL) => {
  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const extractArticleBlocks = (html) =>
  Array.from(String(html ?? '').matchAll(
    /<article\b[^>]*\bjob-search-results-card-col\b[\s\S]*?<\/article>/gi,
  ), (match) => match[0])

const extractComponentText = (html, componentClass) => stripTags(
  String(html ?? '').match(
    new RegExp(`<li[^>]+class=["'][^"']*${componentClass}[^"']*["'][\\s\\S]*?<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i'),
  )?.[1],
)

const extractSummary = (html) => stripTags(
  String(html ?? '').match(
    /<p[^>]+class=["'][^"']*job-search-results-summary[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  )?.[1],
)

const extractDisplayedCount = (html) => {
  const candidates = [
    String(html ?? '').match(/Displaying\s*<b>\s*all(?:&nbsp;|\s)+(\d+)\s*<\/b>\s*entries/i)?.[1],
    String(html ?? '').match(/\bid=["']country_code_count_[^"']*["'][^>]*>\s*(\d+)\s*</i)?.[1],
    String(html ?? '').match(/\bdata-filter=["']country_code["'][^>]*\bdata-value=["']india["'][^>]*\bdata-count=["'](\d+)["']/i)?.[1],
  ]

  for (const candidate of candidates) {
    const count = Number.parseInt(candidate, 10)
    if (Number.isInteger(count) && count >= 0) return count
  }

  return null
}

const extractJobId = (url) => {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).at(-1) || null
  } catch {
    return null
  }
}

const normalizeIndiaLocation = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return /india/i.test(normalized) ? normalized : `${normalized}, India`
}

export const extractJobsFromSearchHtml = (html, {
  scrapedAt = new Date().toISOString(),
} = {}) => extractArticleBlocks(html)
  .map((article) => {
    const titleLink = article.match(
      /<a\b(?=[^>]*\bid=["']link_job_title_[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>([\s\S]*?)<\/a>/i,
    )
    const sourceUrl = toAbsoluteUrl(titleLink?.[1])
    const title = stripTags(titleLink?.[2])
    const location = normalizeIndiaLocation(extractComponentText(article, 'job-component-location'))
    const city = normalizeCity(String(location ?? '').split(',')[0]) || String(location ?? '').split(',')[0]?.trim() || null
    const jobId = extractJobId(sourceUrl)

    if (!sourceUrl || !title || !location || !jobId) return null

    return {
      jobId,
      title,
      company: COMPANY,
      department: extractComponentText(article, 'job-component-department'),
      location,
      city,
      country: 'India',
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: extractComponentText(article, 'job-component-employment-type'),
      experienceRequired: extractComponentText(article, 'job-component-dropdown-field-2'),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: extractSummary(article),
      requisitionId: jobId,
      source: SOURCE,
      link: sourceUrl,
      scrapedAt,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const createWaymoScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const searchUrl = buildIndiaSearchUrl()
    const searchHtml = await fetchText(searchUrl)
    const scrapedAt = now()
    const jobs = extractJobsFromSearchHtml(searchHtml, { scrapedAt })
    const reportedTotal = extractDisplayedCount(searchHtml)

    if (jobs.length === 0 && reportedTotal !== 0) {
      throw new Error('Waymo first-party India search page returned no parseable job cards')
    }

    return attachInventoryEvidence(jobs, {
      status: 'complete-inventory',
      surface: searchUrl,
      firstParty: true,
      listingComplete: true,
      pagesFetched: 1,
      reportedTotal: reportedTotal ?? jobs.length,
      indiaFacetCount: jobs.length,
      verifiedAt: scrapedAt,
      reason: 'waymo-first-party-country-filtered-search-results',
    })
  },
})

export const run = async (options = {}) => createWaymoScraper().run(options)

const isDirectExecution = process.argv[1]
  ?.replaceAll('\\', '/')
  .endsWith('/scraper/waymo/script.js')

if (isDirectExecution || process.argv.includes('--dry-run')) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
