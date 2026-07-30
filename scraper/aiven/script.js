import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { loadConfig } from '../utils/loadConfig.js'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const PROVIDER_METADATA = provider
export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const CAREERS_URL = provider.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  const normalized = String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
  signal,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers\s*(?:&|&amp;)\s*Jobs\s+at\s+Aiven/i.test(page)
    && /(?:og:url|canonical)["'][^>]+https:\/\/aiven\.io\/careers\/job/i.test(page)
    && />\s*Open positions\s*</i.test(page)
    && /\/careers\/job\/\d+/i.test(page)
}

export const extractIndiaJobUrls = (html = '') => {
  const matches = String(html ?? '').matchAll(
    /<a\b[^>]*href=["']([^"']*\/careers\/job\/\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )

  const urls = []
  const seen = new Set()

  for (const match of matches) {
    const label = stripTags(match[2]) || ''
    if (!/india/i.test(label)) continue

    const url = toAbsoluteUrl(match[1])
    if (!url || seen.has(url)) continue

    seen.add(url)
    urls.push(url)
  }

  return urls
}

const extractHeading = (html = '') =>
  stripTags(String(html ?? '').match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1])

const splitHeadingLocation = (heading) => {
  const normalized = normalizeWhitespace(heading)
  const match = normalized?.match(/^(.*)\s+([^,]+),\s*([^,]+),\s*(India)$/i)
  if (!match) return null

  const city = normalizeWhitespace(match[2])
  const state = normalizeWhitespace(match[3])
  const country = normalizeWhitespace(match[4])
  const location = [city, state, country].filter(Boolean).join(', ')
  const title = normalizeWhitespace(match[1])

  if (!title || !location) return null

  return { title, city, state, country, location }
}

const extractJobIdFromUrl = (url) => normalizeWhitespace(String(url ?? '').match(/\/careers\/job\/(\d+)/i)?.[1])

const extractDetailFragments = (html = '') => {
  const truncated = String(html ?? '').split(/How to Recognize and Avoid Employment Scams:/i)[0]
  return [...truncated.matchAll(/<(p|h2|h3|li)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
    .map((match) => stripTags(match[2]))
    .filter(Boolean)
    .filter((value) => !/^apply now$/i.test(value))
    .filter((value) => !/^see all job listings$/i.test(value))
}

const buildJobDescription = (html = '', heading = null) => {
  const fragments = extractDetailFragments(html)
    .filter((value) => value !== heading)

  return normalizeWhitespace(fragments.join(' '))
}

export const extractJobFromDetail = (url, html = '') => {
  const heading = extractHeading(html)
  const parsedHeading = splitHeadingLocation(heading)
  const jobId = extractJobIdFromUrl(url)

  if (!parsedHeading || !jobId) return null

  return {
    title: parsedHeading.title,
    company: COMPANY,
    department: null,
    location: parsedHeading.location,
    city: parsedHeading.city,
    state: parsedHeading.state,
    country: parsedHeading.country,
    jobId,
    requisitionId: jobId,
    sourceUrl: url,
    applyUrl: url,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: buildJobDescription(html, heading),
  }
}

export const createAivenScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
    signal,
  } = {}) {
    const listingHtml = await fetchText(CAREERS_URL, { signal })
    if (!hasOfficialCareersSignal(listingHtml)) {
      throw new Error('Response is not the verified official Aiven careers listing')
    }

    const indiaJobUrls = extractIndiaJobUrls(listingHtml)
    const jobs = []

    for (const url of indiaJobUrls) {
      const detailHtml = await fetchText(url, { signal })
      const job = extractJobFromDetail(url, detailHtml)
      if (job) jobs.push(job)
    }

    if (!jobs.length) {
      throw new Error('Aiven first-party careers surface no longer exposes trusted public Aiven India jobs')
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createAivenScraper().run(options)

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
