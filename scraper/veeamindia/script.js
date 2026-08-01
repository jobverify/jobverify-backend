import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

export const SOURCE = 'veeamindia'
export const COMPANY = 'Veeam India'
export const OFFICIAL_BRAND_NAME = 'Veeam'
export const VERIFIED_ON = '2026-07-25'
export const INDIA_CAREERS_URL = 'https://careers.veeam.com/india'
export const INDIA_JOBS_URL = 'https://careers.veeam.com/location/india-jobs/22681/1269750/2'
export const COMPANY_DOMAIN = 'careers.veeam.com'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value) => pattern.exec(String(value ?? ''))?.[1] ?? null

const toFirstPartyUrl = (value) => {
  try {
    const url = new URL(decodeHtmlEntities(value), INDIA_CAREERS_URL)
    return url.hostname === COMPANY_DOMAIN ? url.toString() : null
  } catch {
    return null
  }
}

const toAnyHttpUrl = (value) => {
  try {
    const url = new URL(decodeHtmlEntities(value), INDIA_CAREERS_URL)
    if (!['http:', 'https:'].includes(url.protocol)) return null
    return url.toString()
  } catch {
    return null
  }
}

const normalizePostingDate = (value) => {
  const text = normalizeWhitespace(value)
  if (!text) return null

  const slashDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text)
  if (slashDate) {
    return `${slashDate[3]}-${slashDate[1]}-${slashDate[2]}`
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  return text
}

const getCityFromLocation = (location) => location?.split(',')[0]?.trim() || null

const extractFieldValue = (html, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return stripTags(extractFirst(
    new RegExp(`<strong[^>]*>\\s*${escapedLabel}\\s*<\\/strong>\\s*<span[^>]*>([\\s\\S]*?)<\\/span>`, 'i'),
    html,
  ))
}

export const buildIndiaJobsUrl = () => INDIA_JOBS_URL

export const extractJobCards = (html) => {
  const cards = [...String(html ?? '').matchAll(
    /<article\b[^>]*data-job-item=["']true["'][^>]*>([\s\S]*?)<\/article>/gi,
  )]

  return cards.map((match) => {
    const cardHtml = match[1]
    const sourceUrl = toFirstPartyUrl(extractFirst(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i, cardHtml))
    const title = stripTags(extractFirst(/<a\b[^>]*>([\s\S]*?)<\/a>/i, cardHtml))
    const location = stripTags(
      extractFirst(/data-ph-at-job-location-text=["']true["'][^>]*>([\s\S]*?)<\/[^>]+>/i, cardHtml)
      || extractFirst(/job-location[^>]*>([\s\S]*?)<\/[^>]+>/i, cardHtml),
    )
    const jobId = extractFirst(/\/(\d+)(?:[?#][^"']*)?$/i, sourceUrl)
    const postingDate = normalizePostingDate(
      extractFirst(/data-ph-at-job-posted-date-text=["']true["'][^>]*>([\s\S]*?)<\/[^>]+>/i, cardHtml)
      || extractFirst(/job-posted-date[^>]*>([\s\S]*?)<\/[^>]+>/i, cardHtml),
    )

    if (!sourceUrl || !title || !location || !jobId) return null

    return {
      title,
      location,
      city: getCityFromLocation(location),
      sourceUrl,
      jobId,
      postingDate,
    }
  }).filter(Boolean)
}

export const extractJobDetail = (html, listing = {}) => {
  const descriptionHtml = extractFirst(/<div\b[^>]*data-job-description=["']true["'][^>]*>([\s\S]*?)<\/div>/i, html)
  const summaryHtml = extractFirst(/<div\b[^>]*data-job-description=["']true["'][^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i, html)
  const location = stripTags(
    extractFirst(/data-job-location=["']true["'][^>]*>([\s\S]*?)<\/[^>]+>/i, html),
  ) || listing.location || null

  return {
    title: stripTags(extractFirst(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, html)) || listing.title || null,
    location,
    city: getCityFromLocation(location) || listing.city || null,
    sourceUrl: listing.sourceUrl || null,
    jobId: listing.jobId || extractFirst(/\/(\d+)(?:[?#][^"']*)?$/i, listing.sourceUrl),
    jobDescription: stripTags(summaryHtml),
    employmentType: extractFieldValue(html, 'Role Type'),
    department: extractFieldValue(html, 'Function'),
    team: extractFieldValue(html, 'Team'),
    workLocation: extractFieldValue(html, 'Work Location'),
    postingDate: normalizePostingDate(extractFieldValue(html, 'Date Posted')) || listing.postingDate || null,
    applyUrl: toAnyHttpUrl(extractFirst(/<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*Apply/i, html)),
    requiredSkills: [...String(descriptionHtml ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean),
  }
}

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
  signal,
})

export const createVeeamIndiaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    maxJobs = null,
    signal,
  } = {}) {
    const listings = extractJobCards(await fetchText(buildIndiaJobsUrl(), { signal }))
    const jobs = []

    for (const listing of listings) {
      const detail = extractJobDetail(await fetchText(listing.sourceUrl, { signal }), listing)
      if (!detail.title || !detail.location || !detail.applyUrl) continue

      jobs.push({
        ...detail,
        company: COMPANY,
        source: SOURCE,
        country: 'India',
        companyCareerPage: INDIA_CAREERS_URL,
        companyDomain: COMPANY_DOMAIN,
        atsPlatform: 'phenom-first-party-careers',
        link: detail.applyUrl,
        scrapedAt: new Date().toISOString(),
      })

      if (Number.isInteger(maxJobs) && jobs.length >= maxJobs) {
        return jobs
      }
    }

    return jobs
  },
})

export const run = async (options = {}) => createVeeamIndiaScraper().run(options)

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
