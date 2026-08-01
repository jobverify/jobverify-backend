import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'mcx'
export const COMPANY = 'MCX'
export const HOMEPAGE_URL = 'https://www.mcxindia.com/'
export const CAREERS_URL = 'https://classic.mcxindia.com/careers/workwithus'
export const APPLY_URL = 'https://classic.mcxindia.com/careers/apply-online'
export const COMPANY_DOMAIN = 'classic.mcxindia.com'
export const ATS_PLATFORM = 'official-company-careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/â€“|â€”/g, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtml(value)
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

const toLines = (value) => String(value ?? '')
  .replace(/\r/g, '')
  .split('\n')
  .map((line) => normalizeWhitespace(line))
  .filter(Boolean)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const buildAbsoluteUrl = (value, baseUrl = CAREERS_URL) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    return new URL(normalized, baseUrl).toString()
  } catch {
    return null
  }
}

const extractField = (block, label) => {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = String(block ?? '').match(
    new RegExp(`<h[1-6][^>]*>\\s*${escapedLabel}\\s*</h[1-6]>\\s*([\\s\\S]*?)(?=<h[1-6][^>]*>\\s*(?:Role|Location|Qualification Profile|Experience|Job Responsibilities)\\s*</h[1-6]>|<a\\b[^>]*>\\s*Apply Now\\s*</a>|$)`, 'i'),
  )

  return stripTags(match?.[1] || '')
}

const extractResponsibilities = (block) => {
  const html = String(block ?? '')
  const sectionMatch = html.match(
    /<h[1-6][^>]*>\s*Job Responsibilities\s*<\/h[1-6]>\s*([\s\S]*?)(?=<a\b[^>]*>\s*Apply Now\s*<\/a>|$)/i,
  )
  const sectionHtml = sectionMatch?.[1] || ''
  const items = [...sectionHtml.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
    .map((match) => stripTags(match[1]))
    .filter(Boolean)

  if (items.length > 0) return items

  return toLines(stripTags(sectionHtml))
}

const buildJobDescription = ({ role, location, minimumQualification, experienceRequired, responsibilities }) => [
  role ? `Role: ${role}` : null,
  location ? `Location: ${location}` : null,
  minimumQualification ? `Qualification Profile: ${minimumQualification}` : null,
  experienceRequired ? `Experience: ${experienceRequired}` : null,
  responsibilities.length > 0 ? 'Job Responsibilities:' : null,
  ...responsibilities.map((item) => `- ${item}`),
].filter(Boolean).join('\n')

export const hasVerifiedCareersPageSignal = (html) => {
  const page = String(html ?? '')

  return /work\s+with\s+us/i.test(page)
    && /apply\s+now/i.test(page)
    && /careers@mcxindia\.com/i.test(page)
    && /job\s+responsibilities/i.test(page)
}

export const extractJobsFromCareersPage = (html) => {
  if (!hasVerifiedCareersPageSignal(html)) {
    throw new Error('The verified MCX careers surface no longer matches the expected first-party public jobs page')
  }

  const page = String(html ?? '')
  const jobs = []
  const blockPattern = /<h[2-6][^>]*>\s*(?:<a\b[^>]*>)?\s*([^<]+?)\s*(?:<\/a>)?\s*<\/h[2-6]>\s*([\s\S]*?)<a\b[^>]*href="([^"]+)"[^>]*>\s*Apply Now\s*<\/a>/gi

  for (const match of page.matchAll(blockPattern)) {
    const title = normalizeWhitespace(match[1])
    const block = match[2]
    const applyUrl = buildAbsoluteUrl(match[3], CAREERS_URL)

    if (!title || !applyUrl) continue
    if (/^(role|location|qualification profile|experience|job responsibilities)$/i.test(title)) continue

    const role = extractField(block, 'Role') || title
    const location = extractField(block, 'Location')
    const minimumQualification = extractField(block, 'Qualification Profile')
    const experienceRequired = extractField(block, 'Experience')
    const responsibilities = extractResponsibilities(block)
    const jobDescription = buildJobDescription({
      role,
      location,
      minimumQualification,
      experienceRequired,
      responsibilities,
    })

    jobs.push({
      title,
      location,
      sourceUrl: CAREERS_URL,
      applyUrl,
      minimumQualification,
      experienceRequired,
      jobDescription,
    })
  }

  if (jobs.length === 0) {
    throw new Error('MCX careers page no longer exposes the verified current openings blocks')
  }

  return jobs
}

const buildJob = (job, scrapedAt) => {
  const city = normalizeWhitespace(job.location)
  const title = normalizeWhitespace(job.title)
  const location = city ? `${city}, India` : 'India'
  const identifier = slugify(`${title}-${city || 'india'}`)

  return {
    title,
    company: COMPANY,
    department: null,
    location,
    city,
    country: 'India',
    jobId: `${SOURCE}-${identifier}`,
    requisitionId: `${SOURCE}-${identifier}`,
    sourceUrl: CAREERS_URL,
    applyUrl: job.applyUrl,
    employmentType: null,
    workplaceType: null,
    experienceRequired: job.experienceRequired,
    minimumQualification: job.minimumQualification,
    preferredQualification: null,
    requiredSkills: [],
    compensation: null,
    postingDate: null,
    closingDate: null,
    jobDescription: job.jobDescription,
    source: SOURCE,
    companyCareerPage: CAREERS_URL,
    companyDomain: COMPANY_DOMAIN,
    atsPlatform: ATS_PLATFORM,
    link: job.applyUrl,
    scrapedAt,
  }
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const createMcxScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const scrapedAt = String(now())

    return extractJobsFromCareersPage(careersHtml)
      .map((job) => buildJob(job, scrapedAt))
  },
})

export const run = async (options = {}) => createMcxScraper(options).run(options)

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
