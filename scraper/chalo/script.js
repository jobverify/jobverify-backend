import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'chalo'
export const COMPANY = 'Chalo'
export const HOMEPAGE_URL = 'https://chalo.com/'
export const JOBS_URL = 'https://chalo.com/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (...parts) => normalizeWhitespace(parts.filter(Boolean).join(' '))
  ?.toLowerCase()
  .replace(/['"]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /<title[^>]*>[\s\S]*Chalo[\s\S]*<\/title>/i.test(page)
    && /href=["'](?:https:\/\/chalo\.com)?\/?jobs\/?["']/i.test(page)
    && /(?:Live Bus Tracking|Buy Bus Tickets Online|Chalo App)/i.test(text)
}

export const hasOfficialJobsSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /jobs--wrap\s+filterable/i.test(page)
    && /job-block/i.test(page)
    && /https:\/\/chalo\.com\/web\/jobs\/upload/i.test(page)
    && /talent@chalo\.com/i.test(text)
}

const buildLocation = (city) => {
  const normalized = normalizeWhitespace(city)
  return normalized ? `${normalized}, India` : 'India'
}

export const extractPublicListings = (html) => {
  if (!hasOfficialJobsSignal(html)) {
    throw new Error('Chalo verified jobs page no longer matches the first-party public surface')
  }

  return [...String(html ?? '').matchAll(/<div class="job-block"([^>]*)>([\s\S]*?)<\/div>/gi)]
    .map((match) => {
      const attributes = match[1] || ''
      const blockHtml = match[2] || ''
      const title = stripTags(blockHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1])
      const description = stripTags(blockHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1])
      const city = normalizeWhitespace(attributes.match(/\bdata-city=["']([^"']+)["']/i)?.[1])
        || stripTags([...blockHtml.matchAll(/<h6[^>]*>([\s\S]*?)<\/h6>/gi)][0]?.[1])
      const department = normalizeWhitespace(attributes.match(/\bdata-category=["']([^"']+)["']/i)?.[1])
        || stripTags([...blockHtml.matchAll(/<h6[^>]*>([\s\S]*?)<\/h6>/gi)][1]?.[1])

      if (!title || !city) return null

      const jobId = `${SOURCE}-${slugify(title, city)}`
      if (!jobId) return null

      return {
        title,
        company: COMPANY,
        department,
        location: buildLocation(city),
        city,
        state: null,
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: JOBS_URL,
        applyUrl: JOBS_URL,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: description,
        publicExperienceChecked: true,
      }
    })
    .filter(Boolean)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createChaloScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Chalo verified official homepage no longer matches the trusted first-party surface')
    }

    const jobsHtml = await fetchText(JOBS_URL)
    const jobs = extractPublicListings(jobsHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createChaloScraper().run(options)

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
