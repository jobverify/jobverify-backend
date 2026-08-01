import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

import { GOKHANA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = GOKHANA_CATALOG.source
export const COMPANY = GOKHANA_CATALOG.companyName
export const VERIFIED_ON = GOKHANA_CATALOG.verifiedOn
export const CAREER_PAGE_URL = GOKHANA_CATALOG.companyCareerPage
export const PROVIDER_METADATA = GOKHANA_CATALOG

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const country = parts.at(-1) === 'India' ? 'India' : 'India'
  const location = parts.at(-1) === 'India' ? normalized : `${normalized}, India`

  return {
    location,
    city: parts[0] || null,
    country,
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full-time' || normalized === 'full time') return 'Full-time'
  if (normalized === 'part-time' || normalized === 'part time') return 'Part-time'
  return normalizeWhitespace(value)
}

export const extractLinkedInJobId = (value) =>
  String(value ?? '').match(/linkedin\.com\/jobs\/view\/(\d+)/i)?.[1] ?? null

export const pageHasOfficialGoKhanaSignals = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)?.toLowerCase() || ''

  return /<title>\s*careers\s*-\s*gokhana\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/gokhana\.com\/careers\/["']/i.test(page)
    && normalized.includes('open positions')
    && /linkedin\.com\/jobs\/view\/\d+/i.test(page)
    && /employment type:\s*full-time/i.test(normalized)
}

const JOB_CARD_PATTERN = /<h2 class="elementor-heading-title elementor-size-default">\s*([\s\S]*?)\s*<\/h2>[\s\S]*?<h2 class="elementor-heading-title elementor-size-default">\s*Location\s*:\s*([\s\S]*?)<\/h2>[\s\S]*?<h2 class="elementor-heading-title elementor-size-default">\s*Employment type:\s*([\s\S]*?)<\/h2>[\s\S]*?<a[^>]+href="([^"]*linkedin\.com\/jobs\/view\/\d+[^"]*)"[\s\S]*?<span class="elementor-button-text">\s*Apply Now\s*<\/span>/gi

export const extractJobsFromCareerPage = (html) => {
  const jobs = []
  const seenJobIds = new Set()

  for (const match of String(html ?? '').matchAll(JOB_CARD_PATTERN)) {
    const [, rawTitle, rawLocation, rawEmploymentType, rawApplyUrl] = match
    const title = normalizeWhitespace(rawTitle)
    const locationData = parseLocation(rawLocation)
    const employmentType = normalizeEmploymentType(rawEmploymentType)
    const applyUrl = normalizeWhitespace(rawApplyUrl)?.replace(/&amp;/g, '&') || null
    const jobId = extractLinkedInJobId(applyUrl)

    if (!title || !applyUrl || !jobId || seenJobIds.has(jobId)) {
      continue
    }

    seenJobIds.add(jobId)
    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: locationData.location,
      city: locationData.city,
      country: locationData.country,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREER_PAGE_URL,
      applyUrl,
      employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: `Official GoKhana careers page lists ${title} in ${locationData.location}. Employment type: ${employmentType}. Apply via LinkedIn.`,
    })
  }

  return jobs
}

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

export const createGoKhanaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREER_PAGE_URL)
    if (!pageHasOfficialGoKhanaSignals(html)) {
      throw new Error('GoKhana official careers page no longer matches the verified public surface')
    }

    const jobs = extractJobsFromCareerPage(html)
    if (jobs.length === 0) {
      throw new Error('GoKhana official careers page no longer matches the verified public surface')
    }

    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs
    const scrapedAt = now()

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createGoKhanaScraper().run(options)

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
