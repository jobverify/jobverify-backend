import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://compare.buyhatke.com/company/'

const COMPANY = 'Buyhatke'
const SOURCE = 'buyhatke'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => normalizeWhitespace(value)

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, CAREERS_URL).toString()
  } catch {
    return null
  }
}

const isCompanyRoleUrl = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return false

  try {
    const parsed = new URL(absoluteUrl)
    return parsed.origin === 'https://compare.buyhatke.com'
      && /^\/company\/[^/]+\.php$/i.test(parsed.pathname)
  } catch {
    return false
  }
}

const toJobId = (value) => {
  const absoluteUrl = toAbsoluteUrl(value)
  if (!absoluteUrl) return null

  try {
    return new URL(absoluteUrl).pathname
      .replace(/\/+$/, '')
      .split('/')
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.php$/i, '') || null
  } catch {
    return null
  }
}

const extractFirst = (pattern, value) => {
  const match = String(value ?? '').match(pattern)
  return match ? stripTags(match[1]) : null
}

const EXCLUDED_ROLE_PATHS = new Set([
  'index',
  'about-us',
  'media',
  'press-release',
  'blog',
  'contact-us',
  'privacy',
  'terms-and-conditions',
])

const extractListItems = (html) => [...String(html ?? '').matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const buildJobDescription = (html) => [...String(html ?? '').matchAll(/<section\b[^>]*>([\s\S]*?)<\/section>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)
  .join('\n\n') || null

const buildListing = ({ title, sourceUrl }) => {
  const jobId = toJobId(sourceUrl)
  if (!title || !sourceUrl || !jobId || !isCompanyRoleUrl(sourceUrl) || EXCLUDED_ROLE_PATHS.has(jobId)) return null

  return {
    title,
    company: COMPANY,
    department: null,
    location: null,
    city: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    employmentType: null,
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /<title>\s*Sales,\s*SEO,\s*Software Engineer Job Openings\s*\|\s*Jobs at Buyhatke\s*<\/title>/i.test(page)
    && /Careers\s*@\s*Buyhatke/i.test(page)
    && /Jobs\s*@\s*Buyhatke/i.test(page)
    && /href=["'][^"']+\.php["']/i.test(page)
}

export const extractListings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('Expected verified Buyhatke careers surface with public opportunities')
  }

  const articleJobs = [...String(html ?? '').matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)]
    .map((match) => {
      const cardHtml = match[1]
      const sourceUrl = toAbsoluteUrl(extractFirst(/<a\b[^>]*href=["']([^"']+)["']/i, cardHtml))
      const title = extractFirst(/<h[1-6]\b[^>]*>([\s\S]*?)<\/h[1-6]>/i, cardHtml)

      return buildListing({ title, sourceUrl })
    })
    .filter(Boolean)

  const linkedRoleJobs = [...String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+\.php)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => buildListing({
      sourceUrl: toAbsoluteUrl(match[1]),
      title: stripTags(match[2]),
    }))
    .filter(Boolean)

  const jobsByUrl = new Map()
  for (const job of [...articleJobs, ...linkedRoleJobs]) {
    if (!jobsByUrl.has(job.sourceUrl)) jobsByUrl.set(job.sourceUrl, job)
  }

  const jobs = [...jobsByUrl.values()]
  if (jobs.length === 0) {
    throw new Error('Expected verified Buyhatke careers surface with public opportunities')
  }

  return jobs
}

export const extractJobDetail = (html, listing = {}) => {
  const title = extractFirst(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i, html)
    || normalizeWhitespace(
      extractFirst(/<title>\s*Buyhatke\s*\|\s*([^<]+)<\/title>/i, html),
    )
    || listing.title
    || null
  const requiredSkills = extractListItems(html)
  const applyUrl = toAbsoluteUrl(
    extractFirst(/<iframe\b[^>]*src=["']([^"']*docs\.google\.com\/forms[^"']*)["']/i, html),
  ) || listing.applyUrl || listing.sourceUrl || null

  return {
    ...listing,
    title,
    company: listing.company || COMPANY,
    department: null,
    location: null,
    city: null,
    country: listing.country || 'India',
    applyUrl,
    employmentType: null,
    minimumQualification: requiredSkills[0] || listing.minimumQualification || null,
    preferredQualification: requiredSkills[1] || listing.preferredQualification || null,
    requiredSkills,
    jobDescription: buildJobDescription(html) || listing.jobDescription || null,
    remoteStatus: null,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createBuyhatkeScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const jobs = []

    for (const listing of extractListings(careersHtml)) {
      const detailHtml = await fetchText(listing.sourceUrl)
      jobs.push(extractJobDetail(detailHtml, listing))
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createBuyhatkeScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  console.log(`Total Buyhatke jobs scraped: ${jobs.length}`)
  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
