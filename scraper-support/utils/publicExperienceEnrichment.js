import { createBrowserFetchSession } from '../shared/browserFetch.js'
import { normalizeScrapedJob } from './normalizeScrapedJob.js'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const BLOCK_TAG_PATTERN = /<\/?(?:article|aside|blockquote|br|dd|div|dl|dt|figcaption|figure|footer|form|h[1-6]|header|hr|li|main|nav|ol|p|section|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi
const SKIP_HOSTNAMES = new Set([
  'example.com',
  'www.example.com',
  'example.org',
  'www.example.org',
  'example.net',
  'www.example.net',
  'localhost',
  '127.0.0.1',
])

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const extractFirst = (pattern, value) => {
  const match = pattern.exec(String(value ?? ''))
  return match ? match[1] : null
}

const extractMetaContent = (key, html) => {
  const escapedKey = escapeRegex(key)
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([\\s\\S]*?)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([\\s\\S]*?)["'][^>]+(?:property|name)=["']${escapedKey}["']`, 'i'),
  ]

  for (const pattern of patterns) {
    const value = extractFirst(pattern, html)
    if (value) return normalizeWhitespace(value)
  }

  return null
}

const extractTitle = (html) => normalizeWhitespace(
  extractMetaContent('og:title', html)
    || extractFirst(/<title>\s*([\s\S]*?)\s*<\/title>/i, html),
)

const extractPageSummary = (html) => normalizeWhitespace(
  extractMetaContent('og:description', html)
    || extractMetaContent('description', html),
)

const stripHtmlToText = (html) => normalizeWhitespace(
  String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(BLOCK_TAG_PATTERN, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const formatYears = (minimum, maximum = null, suffix = '') => {
  if (!minimum) return null
  const singular = Number.parseFloat(maximum ?? minimum) === 1 && !maximum && suffix !== '+'
  if (maximum) return `${minimum}-${maximum} years`
  return `${minimum}${suffix} ${singular ? 'year' : 'years'}`
}

const extractLabeledExperience = (text) => {
  const normalized = normalizeWhitespace(text)
  if (!normalized) return null

  const rangeMatch = normalized.match(
    /\b(?:required experience|years of experience|required years of experience|total years of experience|experience required)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)(?:\s*(?:years?|yrs?))?\b/i,
  )
  if (rangeMatch) {
    return formatYears(rangeMatch[1], rangeMatch[2])
  }

  const plusMatch = normalized.match(
    /\b(?:required experience|years of experience|required years of experience|total years of experience|experience required)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(\+|plus)(?:\s*(?:years?|yrs?))?\b/i,
  )
  if (plusMatch) {
    return formatYears(plusMatch[1], null, '+')
  }

  const singleMatch = normalized.match(
    /\b(?:required experience|years of experience|required years of experience|total years of experience|experience required)\b\s*[:\-]?\s*(\d+(?:\.\d+)?)(?:\s*(?:years?|yrs?))?\b/i,
  )
  if (singleMatch) {
    return formatYears(singleMatch[1])
  }

  return null
}

const RELEVANT_JOB_CONTENT_PATTERN = /\b(job description|about job|qualifications?|requirements?|responsibilities|required skills|preferred qualifications?|key job details|what you bring|apply for this position)\b/i

const hasRelevantJobContent = (pageText) => RELEVANT_JOB_CONTENT_PATTERN.test(pageText || '')

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const shouldSkipDefaultFetch = (jobUrl) => {
  try {
    const parsed = new URL(jobUrl)
    return SKIP_HOSTNAMES.has(parsed.hostname.toLowerCase()) || parsed.hostname.endsWith('.example')
  } catch {
    return true
  }
}

export const inferExperienceFromPublicPageHtml = (job = {}, html) => {
  const pageText = stripHtmlToText(html)
  const pageSummary = extractPageSummary(html)
  const explicitExperience = extractLabeledExperience(pageText)
  const relevantPageText = hasRelevantJobContent(pageText) || explicitExperience
    ? pageText
    : null

  const normalized = normalizeScrapedJob({
    ...job,
    title: extractTitle(html) || job.title,
    experienceRequired: job.experienceRequired || explicitExperience,
    description: [
      job.description,
      job.jobDescription,
      pageSummary,
      relevantPageText,
    ]
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
      .join('\n\n') || null,
  }, {
    source: job.source || null,
  })

  return {
    ...job,
    title: normalized.title,
    jobDescription: job.jobDescription || pageSummary || null,
    experienceRequired: normalized.experienceRequired,
  }
}

export const enrichJobWithPublicExperience = async (job = {}, {
  fetchText = null,
  fetchBrowserText = null,
  getBrowserText = null,
} = {}) => {
  if (job.experienceRequired) return job

  const jobUrl = job.applyUrl || job.sourceUrl || job.link
  if (!jobUrl) return job

  const fetchImpl = fetchText || defaultFetchText
  const canUseDefaultFetch = !fetchText && !shouldSkipDefaultFetch(jobUrl)
  const canUseBrowserFetch = Boolean(fetchBrowserText || getBrowserText)
  if (!fetchText && !canUseDefaultFetch && !canUseBrowserFetch) return job

  let enriched = job
  try {
    if (fetchText || canUseDefaultFetch) {
      const html = await fetchImpl(jobUrl)
      enriched = inferExperienceFromPublicPageHtml(job, html)
    }
  } catch {
    enriched = job
  }

  if (enriched.experienceRequired || !canUseBrowserFetch) {
    return enriched
  }

  try {
    const browserFetchImpl = fetchBrowserText || await getBrowserText?.()
    if (!browserFetchImpl) return enriched

    const browserHtml = await browserFetchImpl(jobUrl)
    return inferExperienceFromPublicPageHtml(job, browserHtml)
  } catch {
    return enriched
  }
}

export const enrichJobsWithPublicExperience = async (jobs = [], options = {}) => {
  const concurrency = Math.max(1, Number.isInteger(options.concurrency) ? options.concurrency : 4)
  const results = new Array(jobs.length)
  let cursor = 0
  let browserFallback = null

  const getBrowserFallback = async () => {
    if (options.fetchBrowserText) {
      return {
        fetchBrowserText: options.fetchBrowserText,
        close: async () => {},
      }
    }

    if (options.useBrowserFallback === false) {
      return null
    }

    if (browserFallback) return browserFallback

    const session = await createBrowserFetchSession({
      userAgent: USER_AGENT,
      timeoutMs: 60000,
    })
    let queue = Promise.resolve()

    const fetchBrowserText = (url) => {
      const next = queue.then(
        () => session.fetchText(url),
        () => session.fetchText(url),
      )
      queue = next.catch(() => {})
      return next
    }

    browserFallback = {
      fetchBrowserText,
      close: async () => session.close(),
    }

    return browserFallback
  }

  const worker = async () => {
    while (cursor < jobs.length) {
      const currentIndex = cursor
      cursor += 1
      results[currentIndex] = await enrichJobWithPublicExperience(jobs[currentIndex], {
        ...options,
        fetchBrowserText: options.fetchBrowserText || null,
        getBrowserText: options.fetchBrowserText
          ? null
          : async () => {
              const browserHandler = await getBrowserFallback()
              return browserHandler?.fetchBrowserText || null
            },
      })
    }
  }

  try {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker()),
    )
  } finally {
    if (browserFallback) {
      await browserFallback.close()
    }
  }

  return results
}
