import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const INDIA_SITE_URL = 'https://www.wsp.com/en-gl/sites/india'
export const JOBS_PAGE_URL = 'https://www.wsp.com/en-gl/careers/job-opportunities?country=IN'

const COMPANY = 'WSP India'
const SOURCE = 'wspindia'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'
const ORACLE_PREVIEW_LINK_PATTERN =
  /https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/requisitions\/preview\/(\d+)/i

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|li|span|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, JOBS_PAGE_URL).toString()
  } catch {
    return null
  }
}

const extractStructuredText = (html) =>
  [...String(html ?? '').matchAll(/<(span|div|p)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map(([, , value]) => stripTags(value))
    .filter(Boolean)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  return normalized.split('|')[0]?.trim() || null
}

export const hasOfficialIndiaSiteSignal = (html) => {
  const page = String(html ?? '')
  return /WSP/i.test(page)
    && /Search and apply/i.test(page)
    && /\/en-gl\/careers\/job-opportunities\?country=IN/i.test(page)
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')
  return /Find your next opportunity/i.test(page)
    && /emit\.fa\.ca3\.oraclecloud\.com/i.test(page)
}

export const buildJobsPageUrl = ({ page = 1 } = {}) =>
  Number(page) > 1 ? `${JOBS_PAGE_URL}&page=${Number(page)}` : JOBS_PAGE_URL

export const extractMaxPageNumber = (html) => {
  const pageNumbers = [...String(html ?? '').matchAll(/country=IN(?:&amp;|&)page=(\d+)/gi)]
    .map(([, value]) => Number.parseInt(value, 10))
    .filter(Number.isInteger)

  return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 1
}

export const extractJobsFromHtml = (html) => {
  const jobs = []
  const page = String(html ?? '')
  const anchorPattern = /<a\b[^>]*href=(["'])(https:\/\/emit\.fa\.ca3\.oraclecloud\.com\/hcmUI\/CandidateExperience\/en\/sites\/CX_2001\/requisitions\/preview\/\d+)\1[^>]*>([\s\S]*?)<\/a>/gi

  for (const match of page.matchAll(anchorPattern)) {
    const [, , href, innerHtml] = match
    const previewMatch = href.match(ORACLE_PREVIEW_LINK_PATTERN)
    if (!previewMatch) continue

    const segments = extractStructuredText(innerHtml)
    const title = normalizeWhitespace(segments[0]) || stripTags(innerHtml)
    const location = normalizeWhitespace(segments[1] || segments.at(-1)) || null

    if (!title || !location) continue

    jobs.push({
      title,
      company: COMPANY,
      location,
      city: extractCity(location),
      sourceUrl: href,
      applyUrl: href,
      jobId: previewMatch[1],
      requisitionId: previewMatch[1],
      jobDescription: null,
    })
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

export const createWspIndiaScraper = ({
  maxPages = Number.isInteger(config.maxPages) ? config.maxPages : null,
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const indiaSiteHtml = await fetchText(INDIA_SITE_URL)
    if (!hasOfficialIndiaSiteSignal(indiaSiteHtml)) {
      throw new Error('WSP India official India site surface changed; refusing to guess the jobs handoff')
    }

    const firstJobsPageHtml = await fetchText(buildJobsPageUrl({ page: 1 }))
    if (!hasOfficialJobsPageSignal(firstJobsPageHtml)) {
      throw new Error('WSP India official jobs page surface changed; refusing to guess job links')
    }

    const discoveredMaxPages = extractMaxPageNumber(firstJobsPageHtml)
    const totalPages = Math.max(1, maxPages ? Math.min(maxPages, discoveredMaxPages) : discoveredMaxPages)
    const jobs = []
    const seenJobIds = new Set()
    const pageHtmlCache = new Map([[1, firstJobsPageHtml]])

    for (let page = 1; page <= totalPages; page += 1) {
      const pageHtml = pageHtmlCache.get(page) || await fetchText(buildJobsPageUrl({ page }))
      const pageJobs = extractJobsFromHtml(pageHtml)
      let addedOnPage = 0

      for (const job of pageJobs) {
        if (!job.jobId || seenJobIds.has(job.jobId)) continue
        seenJobIds.add(job.jobId)
        addedOnPage += 1

        jobs.push({
          ...job,
          source: SOURCE,
          link: job.applyUrl || job.sourceUrl,
          scrapedAt: now(),
        })

        if (maxJobs && jobs.length >= maxJobs) {
          return jobs
        }
      }

      if (pageJobs.length === 0 || addedOnPage === 0) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createWspIndiaScraper().run(options)

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
