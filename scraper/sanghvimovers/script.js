import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SANGHVI_MOVERS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SANGHVI_MOVERS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LABELS = [
  'Job ID :',
  'Job Title :',
  'Job Description :',
  'Key Skills :',
  'Roles & Responsibilities :',
  'Work Experience (Min & Max in years) :',
  'Qualification :',
  'Job Location :',
  'No. of Positions :',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\u00a0/g, ' ')

const normalizeString = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value).replace(/\s+/g, ' ').trim()
  return normalized || null
}

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const slugify = (value) => normalizeString(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  || 'job'

const htmlToText = (html = '') => decodeHtmlEntities(String(html ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/section|\/article|\/main|\/body|\/html|\/h[1-6]|\/ol|\/ul|\/li)\b[^>]*>/gi, '\n')
  .replace(/<(p|div|section|article|main|body|html|h[1-6]|ol|ul|li)\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{2,}/g, '\n')
  .trim()

const extractRawField = (block, label) => {
  const otherLabels = LABELS.filter((item) => item !== label).map((item) => escapeRegExp(item))
  const pattern = new RegExp(
    `${escapeRegExp(label)}\\s*([\\s\\S]*?)(?=\\n(?:${otherLabels.join('|')})|$)`,
    'i',
  )
  const value = pattern.exec(block)?.[1] ?? null
  return value == null ? null : String(value).trim()
}

const extractField = (block, label) => normalizeString(extractRawField(block, label))

const extractListField = (block, label) => (extractRawField(block, label) || '')
  .split('\n')
  .map((item) => normalizeString(item))
  .filter(Boolean)

const buildJobId = (title, location) => `${slugify(title)}-${slugify(location || 'india')}`

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

export const defaultFetchText = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

const extractBlocks = (html = '') => {
  const text = htmlToText(html)
  const startIndex = text.indexOf('Join Our Team')
  const jobsText = startIndex >= 0 ? text.slice(startIndex) : text

  return jobsText
    .split(/\bApply Now\b/i)
    .map((block) => block.trim())
    .filter((block) => /Job Title\s*:/i.test(block))
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  const text = htmlToText(rawHtml)

  return /<title[^>]*>\s*Careers at Sanghvi Movers\s*\|\s*Join Asia(?:&#x27;|'|’)s Largest Crane Leader\s*<\/title>/i.test(rawHtml)
    && text.includes('Join Our Team')
}

export const hasPublicJobSignals = (html = '') => {
  const text = htmlToText(html)
  return /Job Title\s*:/i.test(text) && /\bApply Now\b/i.test(text)
}

export const extractStaticJobs = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => extractBlocks(html)
  .map((block) => {
    const title = extractField(block, 'Job Title :')
    const location = extractField(block, 'Job Location :') || 'India'
    const jobId = buildJobId(title, location)

    if (!title) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location,
      city: null,
      state: null,
      country: 'India',
      workplaceType: null,
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      link: CAREERS_URL,
      source: SOURCE,
      employmentType: null,
      experienceRequired: extractField(block, 'Work Experience (Min & Max in years) :'),
      minimumQualification: extractField(block, 'Qualification :'),
      preferredQualification: null,
      requiredSkills: extractListField(block, 'Key Skills :'),
      postingDate: null,
      closingDate: null,
      jobDescription: extractField(block, 'Job Description :'),
      scrapedAt,
    }
  })
  .filter(Boolean)

export const createSanghviMoversScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Verified Sanghvi Movers careers page changed materially')
    }

    if (!hasPublicJobSignals(careersHtml)) {
      throw new Error('Verified Sanghvi Movers public jobs surface changed materially')
    }

    const jobs = extractStaticJobs(careersHtml, {
      scrapedAt: now(),
    })

    if (jobs.length === 0) {
      throw new Error('Verified Sanghvi Movers public jobs surface changed materially')
    }

    return jobs
  },
})

export const run = async (options = {}) => createSanghviMoversScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, SOURCE)
}
