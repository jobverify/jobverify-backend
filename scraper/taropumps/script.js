import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'taropumps'
export const COMPANY = 'Taro Pumps'
export const CAREERS_URL = 'https://www.taropumps.com/careers'
export const VIEW_ALL_JOBS_URL = 'https://www.texmo.com/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, '\'')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripTags = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<\/(div|section|article|li|p|h[1-6]|main|header|footer|a|span)>/gi, '\n')
  .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const extractVisibleLines = (html) => stripTags(html)
  .split(/\r?\n/)
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const toAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const isVerifiedDetailUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return false

  try {
    const parsed = new URL(absoluteUrl)
    return parsed.hostname.toLowerCase() === 'www.texmo.com'
      && parsed.pathname === '/career-details'
      && Boolean(parsed.searchParams.get('id'))
  } catch {
    return false
  }
}

const extractJobId = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return null

  try {
    return new URL(absoluteUrl).searchParams.get('id')
  } catch {
    return null
  }
}

const buildLocation = ({ city, countryLabel }) => {
  const normalizedCity = normalizeWhitespace(city)
  const rawCountry = normalizeWhitespace(countryLabel) || 'INDIA'

  return {
    location: normalizedCity ? `${normalizedCity}, ${rawCountry}` : rawCountry,
    city: normalizedCity,
    country: /india/i.test(rawCountry) ? 'India' : rawCountry,
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Careers at Taro Pumps/i.test(page)
    && /Apply here or email us at/i.test(page)
    && /Latest careers/i.test(page)
}

export const extractViewAllJobsUrl = (html) => {
  const match = String(html ?? '').match(
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*View all jobs\s*<\/a>/i,
  )

  return match ? toAbsoluteUrl(match[1]) : null
}

export const extractJobCards = (html) => {
  if (!hasOfficialCareersSignal(html)) return []

  const jobs = []
  const seenUrls = new Set()

  for (const match of String(html ?? '').matchAll(
    /<a\b[^>]*href=["']([^"']*career-details\?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const detailUrl = toAbsoluteUrl(match[1])
    if (!isVerifiedDetailUrl(detailUrl) || seenUrls.has(detailUrl)) continue

    const lines = extractVisibleLines(match[2]).filter((line) => !/^new$/i.test(line))
    const title = lines[0]
    if (!title) continue

    const cityLine = lines[1] || null
    const hasExplicitCountry = /^india$/i.test(lines[2] || '')
    const countryLine = hasExplicitCountry ? lines[2] : null
    const department = hasExplicitCountry ? lines[3] || null : lines[2] || null
    const jobId = extractJobId(detailUrl)
    if (!jobId) continue

    const location = buildLocation({
      city: cityLine,
      countryLabel: countryLine,
    })

    jobs.push({
      title,
      location: location.location,
      city: location.city,
      country: location.country,
      department,
      jobId,
      requisitionId: jobId,
      sourceUrl: detailUrl,
      applyUrl: detailUrl,
      employmentType: null,
      experienceRequired: null,
      postingDate: null,
      closingDate: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      jobDescription: null,
      remoteStatus: 'On-site',
    })

    seenUrls.add(detailUrl)
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

export const createTaroPumpsScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Taro Pumps careers page no longer matches the verified official public surface')
    }

    const viewAllJobsUrl = extractViewAllJobsUrl(careersHtml)
    if (viewAllJobsUrl !== VIEW_ALL_JOBS_URL) {
      throw new Error('Taro Pumps careers page no longer links to the verified official Texmo careers handoff')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Taro Pumps careers page no longer exposes the verified first-party job cards')
    }

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createTaroPumpsScraper().run(options)

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
