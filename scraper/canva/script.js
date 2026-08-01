import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'canva'
export const COMPANY = 'Canva'
export const CAREERS_URL = 'https://www.lifeatcanva.com/en/jobs/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/ul|\/ol|\/section|\/article|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<(p|div|li|ul|ol|section|article|h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const isIndiaLocation = (value) => /\bIndia\b/i.test(normalizeWhitespace(value) || '')

export const buildJobsPageUrl = ({ page = 1 } = {}) => {
  const url = new URL(CAREERS_URL)
  if (Number.isInteger(page) && page > 1) {
    url.searchParams.set('page', String(page))
  }
  return url.toString()
}

export const hasOfficialJobsPageSignal = (html) => {
  const page = String(html ?? '')
  const heading = stripTags(page.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')

  return /<title>\s*Find your dream job\s*\|\s*Canva Careers(?:\s*-\s*Page\s*\d+)?\s*<\/title>/i.test(page)
    && heading === 'Find your dream job'
    && /Location Type/i.test(page)
    && /Work Type/i.test(page)
    && /Live Results/i.test(page)
}

export const normalizeCanvaJobUrl = (value) => {
  if (!value) return null

  try {
    const url = new URL(value, CAREERS_URL)
    const hostname = url.hostname.replace(/^www\./i, '').toLowerCase()
    const pathname = url.pathname.replace(/\/+$/, '')

    if (hostname !== 'lifeatcanva.com') return null
    if (!/^\/en\/jobs\/\d+(?:\/[^/?#]+)*$/i.test(pathname)) return null

    return `https://www.lifeatcanva.com${pathname}/`
  } catch {
    return null
  }
}

const extractJobIdFromUrl = (value) => normalizeCanvaJobUrl(value)?.match(/\/en\/jobs\/(\d+)/i)?.[1] || null

const inferRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase() || ''
  if (!normalized) return 'On-site'
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/^remote\b/i.test(normalized)) return 'Remote'
  if (/^hybrid\b/i.test(normalized)) return 'Hybrid'
  return normalizeCity(normalized.split(',')[0]?.trim() || normalized)
}

const extractCardListItems = (value) => [...String(value ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractArticleJobCards = (html) => [...String(html ?? '').matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)]
  .map((match) => match[0])
  .filter((block) => /<a\b/i.test(block) && /<li\b/i.test(block))

const extractFallbackJobCards = (html) => [...String(html ?? '').matchAll(
  /(<a\b[^>]+href=["'][^"']*\/en\/jobs\/\d+[^"']*["'][^>]*>[\s\S]*?<\/a>[\s\S]*?<ul\b[^>]*>[\s\S]*?<\/ul>)/gi,
)]
  .map((match) => match[1])

const getJobCardBlocks = (html) => {
  const articleCards = extractArticleJobCards(html)
  if (articleCards.length > 0) return articleCards
  return extractFallbackJobCards(html)
}

export const extractPaginationSummary = (html) => {
  const page = String(html ?? '')
  const currentPage = Number.parseInt(
    page.match(/aria-current=["']page["'][^>]*>\s*(\d+)\s*</i)?.[1]
      || page.match(/<title>[\s\S]*?Page\s+(\d+)\s*<\/title>/i)?.[1]
      || '1',
    10,
  )

  const pageNumbers = [
    ...new Set(
      [...page.matchAll(/[?&]page=(\d+)/gi)]
        .map((match) => Number.parseInt(match[1], 10))
        .filter(Number.isFinite),
    ),
  ]

  const totalPages = Math.max(currentPage, ...pageNumbers, 1)
  const totalJobCount = Number.parseInt(page.match(/of\s+(\d+)\s+Live Results/i)?.[1] || '', 10) || null

  return {
    currentPage,
    totalPages,
    hasNext: currentPage < totalPages,
    totalJobCount,
  }
}

export const extractIndiaJobCardsFromPage = (html) => {
  const jobs = []

  for (const block of getJobCardBlocks(html)) {
    const href = block.match(/<a\b[^>]+href=["']([^"']*\/en\/jobs\/\d+[^"']*)["']/i)?.[1] || null
    const sourceUrl = normalizeCanvaJobUrl(href)
    const title = stripTags(
      block.match(/<h[1-6][^>]*>\s*<a\b[^>]*>([\s\S]*?)<\/a>\s*<\/h[1-6]>/i)?.[1]
        || block.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1],
    )
    const listItems = extractCardListItems(block)
    const location = listItems[0] || null
    const department = listItems[1] || null

    if (isIndiaLocation(location) && !sourceUrl) {
      throw new Error('Canva jobs page no longer exposes the verified first-party Canva job URLs')
    }

    if (!title || !location || !sourceUrl || !isIndiaLocation(location)) continue

    const jobId = extractJobIdFromUrl(sourceUrl)
    if (!jobId) {
      throw new Error('Canva jobs page no longer exposes the verified first-party Canva job URLs')
    }

    jobs.push({
      title,
      location,
      department,
      sourceUrl,
      jobId,
      requisitionId: jobId,
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

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const createCanvaScraper = ({
  maxJobs = null,
  maxPages = null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
    now = () => new Date().toISOString(),
  } = {}) {
    const selectedMaxPages = Number.isInteger(maxPages) && maxPages > 0
      ? maxPages
      : Number.POSITIVE_INFINITY

    let browserSession = null
    const jobs = []
    const seenJobIds = new Set()
    let currentPage = 1

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserTextFetcher = fetchBrowserText || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchText(url)
    })

    const fetchPageText = async (url) => {
      try {
        return await fetchText(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserTextFetcher(url)
      }
    }

    try {
      while (currentPage <= selectedMaxPages) {
        const pageUrl = buildJobsPageUrl({ page: currentPage })
        const html = await fetchPageText(pageUrl)

        if (!hasOfficialJobsPageSignal(html)) {
          throw new Error('Canva jobs page no longer matches the verified official Canva jobs surface')
        }

        const pagination = extractPaginationSummary(html)
        if (pagination.currentPage !== currentPage) {
          throw new Error('Canva jobs page no longer matches the verified official Canva jobs surface')
        }

        const pageJobs = extractIndiaJobCardsFromPage(html)
        for (const job of pageJobs) {
          if (seenJobIds.has(job.jobId)) continue
          seenJobIds.add(job.jobId)

          jobs.push({
            title: job.title,
            company: COMPANY,
            location: job.location,
            city: deriveCity(job.location),
            country: 'India',
            link: job.sourceUrl,
            applyUrl: job.sourceUrl,
            sourceUrl: job.sourceUrl,
            source: SOURCE,
            jobId: job.jobId,
            requisitionId: job.requisitionId,
            department: job.department,
            employmentType: null,
            experienceRequired: null,
            jobDescription: null,
            minimumQualification: null,
            preferredQualification: null,
            requiredSkills: [],
            postingDate: null,
            remoteStatus: inferRemoteStatus(job.location),
            scrapedAt: now(),
          })

          if (Number.isInteger(maxJobs) && maxJobs > 0 && jobs.length >= maxJobs) {
            return jobs
          }
        }

        if (!pagination.hasNext) break
        currentPage += 1
      }

      return jobs
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createCanvaScraper(options).run(options)

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
