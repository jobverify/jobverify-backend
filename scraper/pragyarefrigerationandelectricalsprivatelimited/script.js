import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'pragyarefrigerationandelectricalsprivatelimited'
export const COMPANY = 'Pragya Refrigeration and Electricals Private Limited'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 13, 2026 that Pragya Refrigeration and Electricals Private Limited publishes public openings on its first-party careers page at https://pragyarefrigeration.in/careers/.'
export const CAREERS_URL = 'https://pragyarefrigeration.in/careers/'
export const CAREERS_API_URL = 'https://pragyarefrigeration.in/wp-json/wp/v2/pages?slug=careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#8211;|&#8212;/gi, '-')
  .replace(/&#038;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&lsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/\s+/g, ' ')
  .trim()

const stripHtml = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/section|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const normalizeDate = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const match = /^(\d{4}-\d{2}-\d{2})T/.exec(normalized)
  return match ? match[1] : normalized
}

const normalizeTitle = (value) => normalizeWhitespace(value)
  .replace(/\s*:\s*-*\s*$/g, '')

const toAbsoluteUrl = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return CAREERS_URL
  return new URL(normalized, CAREERS_URL).href
}

const parseRoleBlock = (roleHtml, page) => {
  const headingMatch = roleHtml.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i)
  const title = normalizeTitle(stripHtml(headingMatch?.[1]))
  if (!title) return null

  const text = stripHtml(roleHtml)
  const qualification = normalizeWhitespace(text.match(/Qualification:\s*(.*?)(?=\s+Experience:|\s+Roll:|\s+Role:|$)/i)?.[1])
  const experience = normalizeWhitespace(text.match(/Experience:\s*(.*?)(?=\s+Roll:|\s+Role:|$)/i)?.[1])
  const roleDescription = normalizeWhitespace(
    text.match(/(?:Roll|Role):\s*(.*)$/i)?.[1],
  )
  const pageId = normalizeWhitespace(page?.id)
  const jobId = `careers-${pageId}-${slugify(title)}`
  const sourceUrl = toAbsoluteUrl(page?.link)

  return {
    title,
    company: COMPANY,
    location: null,
    city: null,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl: sourceUrl,
    department: null,
    employmentType: null,
    experienceRequired: experience || null,
    minimumQualification: qualification || null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeDate(page?.modified),
    closingDate: null,
    jobDescription: roleDescription || null,
  }
}

const extractRoleBlocks = (renderedHtml) => {
  const html = String(renderedHtml ?? '')
  const blocks = [...html.matchAll(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>([\s\S]*?)(?=<h[1-6][^>]*>|$)/gi)]

  if (blocks.length === 0) return []

  return blocks.map((match) => match[0])
}

export const isVerifiedCareersPage = (page) => {
  const text = stripHtml(page?.content?.rendered).toLowerCase()
  const link = normalizeWhitespace(page?.link)

  return link === CAREERS_URL
    && text.includes('career opportunities')
    && text.includes('open positions')
}

export const extractJobs = (payload) => {
  const page = Array.isArray(payload) ? payload[0] : null
  if (!page || !isVerifiedCareersPage(page)) return []

  return extractRoleBlocks(page.content?.rendered)
    .map((block) => parseRoleBlock(block, page))
    .filter((job) => job?.title && job.experienceRequired && job.jobDescription)
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const createPragyaRefrigerationAndElectricalsPrivateLimitedScraper = () => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const payload = await fetchJson(CAREERS_API_URL)
    const jobs = extractJobs(payload)

    if (jobs.length === 0) {
      throw new Error('Pragya Refrigeration verified first-party careers page no longer exposes the expected public open positions surface')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) =>
  createPragyaRefrigerationAndElectricalsPrivateLimitedScraper().run(options)

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
