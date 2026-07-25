import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://recruit.accelerationrobotics.in/'
const JOBS_URL = 'https://recruit.accelerationrobotics.in/jobs/'

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const absoluteUrl = (value) => {
  if (!value) return null
  return new URL(value, CAREERS_URL).href
}

const getField = (html, className) => stripTags(
  html.match(new RegExp(`<[^>]*class=["'][^"']*\\b${className}\\b[^"']*["'][^>]*>([\\s\\S]*?)<\\/`, 'i'))?.[1],
)

const getPostedDate = (html) => normalizeWhitespace(
  html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1]
    || html.match(/Posted\s+(\d{4}-\d{2}-\d{2})/i)?.[1],
)

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized.includes('intern')) return 'Internship'
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('contract')) return 'Contract'
  return normalizeWhitespace(value)
}

const normalizeExperience = (value) => normalizeWhitespace(value)
  ?.replace(/\byrs?\b/gi, 'years')

const parseCard = (match) => {
  const [, href, cardHtml] = match
  const title = stripTags(cardHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1])
  const sourceUrl = absoluteUrl(href)
  const jobId = sourceUrl?.match(/\/jobs\/([^/?#]+)/i)?.[1]
  const location = getField(cardHtml, 'location') || 'Pune'
  const department = getField(cardHtml, 'category')
  const employmentType = normalizeEmploymentType(getField(cardHtml, 'employment-type'))
  const experienceRequired = normalizeExperience(getField(cardHtml, 'experience'))

  if (!title || !sourceUrl || !jobId) return null

  return {
    title,
    location,
    city: location.split(',')[0].trim(),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: null,
    department,
    employmentType,
    experienceRequired,
    postingDate: getPostedDate(cardHtml),
  }
}

export const extractJobListings = (html) => [...String(html ?? '').matchAll(
  /<a[^>]+href=["']([^"']*\/jobs\/[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
)].map(parseCard).filter(Boolean)

export const extractJobDetail = (html) => {
  const normalized = String(html ?? '')
  const about = normalized.match(/<h[1-6][^>]*>\s*About the Role\s*<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>|$)/i)?.[1]
  const applyUrl = absoluteUrl(normalized.match(/<a[^>]+href=["']([^"']*\/apply)["'][^>]*>\s*Apply(?: Now)?/i)?.[1])
  const location = getField(normalized, 'location') || 'Pune'
  const metadata = stripTags(normalized.match(/class=["'][^"']*job-meta[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)?.[1]) || ''

  return {
    location,
    city: location.split(',')[0].trim(),
    country: 'India',
    employmentType: normalizeEmploymentType(metadata.match(/(Full Time|Part Time|Internship|Contract)/i)?.[1]),
    postingDate: getPostedDate(normalized),
    jobDescription: stripTags(about),
    applyUrl,
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify scraper)',
      Accept: 'text/html,application/xhtml+xml',
    },
  })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createAccelerationRoboticsScraper = ({ fetchText = defaultFetchText, maxJobs = null } = {}) => ({
  async run({ fetchText: overrideFetchText } = {}) {
    const fetchImpl = overrideFetchText || fetchText
    const listings = extractJobListings(await fetchImpl(CAREERS_URL))
    const selected = maxJobs ? listings.slice(0, maxJobs) : listings

    const jobs = []
    for (const listing of selected) {
      const detail = extractJobDetail(await fetchImpl(listing.sourceUrl))
      jobs.push({
        ...listing,
        ...Object.fromEntries(Object.entries(detail).filter(([, value]) => value != null)),
        company: 'Acceleration Robotics',
        source: 'accelerationrobotics',
        link: detail.applyUrl || listing.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })
    }
    return jobs
  },
})

export const run = async (options = {}) => createAccelerationRoboticsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()
  if (process.argv.includes('--dry-run')) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'accelerationrobotics')
}
