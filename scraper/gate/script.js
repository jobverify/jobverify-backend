import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'gate'
export const COMPANY = 'Gate'
export const OFFICIAL_CAREERS_URL = 'https://www.gate.com/careers'
export const LEVER_BOARD_URL = 'https://jobs.lever.co/gate'
export const LEVER_ENDPOINT = 'https://api.lever.co/v0/postings/gate?mode=json'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const OFFICIAL_CAREERS_SIGNALS = [
  'gate careers | crypto & web3 jobs at gate | gate.com',
  'career opportunities',
  'start your career journey with gate and explore unlimited opportunities.',
  'job openings',
  'view linkedin',
  'positions open, waiting just for you!',
  'product',
  'engineering',
  'technical support',
  'legal & compliance',
  'investment products',
  'risk control & aml',
  'finance',
  'internship',
]

const LEVER_BOARD_SIGNALS = [
  'location type',
  'work type',
  'location all',
  'team all',
  'Gate Home Page',
]

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(String(value))
    .replace(/[\u2012-\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const isLocationCode = (value) => /^[A-Za-z]+(?:-[A-Z0-9]+)+$/.test(value)

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || isLocationCode(normalized)) return null
  return normalized.split(/\s+-\s+|,/)[0] || null
}

const toIsoDateTime = (value) => {
  const timestamp = Number(value)
  if (!Number.isFinite(timestamp)) return null

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

const toRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (normalized === 'remote') return 'Remote'
  if (normalized === 'hybrid') return 'Hybrid'
  if (normalized === 'onsite' || normalized === 'on-site') return 'On-site'
  return null
}

const toCountryName = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^[A-Z]{2}$/.test(normalized)) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(normalized) || normalized
    } catch {
      return normalized
    }
  }

  return normalized
}

const joinDescriptionParts = (...parts) => normalizeWhitespace(parts.filter(Boolean).join(' '))

const extractJobDescription = (job) => joinDescriptionParts(
  normalizeWhitespace(job?.descriptionPlain),
  stripTags(job?.description),
  normalizeWhitespace(job?.additionalPlain),
  stripTags(job?.additional),
  normalizeWhitespace(job?.openingPlain),
  stripTags(job?.opening),
)

const requireField = (value, fieldName) => {
  if (!value) {
    throw new Error(`Gate Lever jobs payload changed: missing ${fieldName}`)
  }

  return value
}

export const hasOfficialCareersSignal = (html) => {
  const text = stripTags(html)?.toLowerCase() || ''

  return OFFICIAL_CAREERS_SIGNALS.every((signal) => text.includes(signal))
}

export const hasLeverBoardSignal = (html) => {
  const markup = String(html ?? '')
  const text = stripTags(html)?.toLowerCase() || ''

  return /<title>\s*Gate\s*<\/title>/i.test(markup)
    && LEVER_BOARD_SIGNALS.every((signal) => text.includes(signal.toLowerCase()))
}

export const extractLeverJobs = (leverJobs = []) => (Array.isArray(leverJobs) ? leverJobs : [])
  .map((job) => {
    const id = requireField(normalizeWhitespace(job?.id), 'job id')
    const title = requireField(normalizeWhitespace(job?.text), `title for ${id}`)
    const location = requireField(
      normalizeWhitespace(job?.categories?.location || job?.categories?.allLocations?.[0]),
      `location for ${id}`,
    )
    const sourceUrl = requireField(normalizeWhitespace(job?.hostedUrl), `hosted URL for ${id}`)

    return {
      title,
      company: COMPANY,
      department: normalizeWhitespace(job?.categories?.team || job?.categories?.department),
      location,
      city: extractCity(location),
      country: toCountryName(job?.country),
      jobId: id,
      requisitionId: id,
      sourceUrl,
      applyUrl: normalizeWhitespace(job?.applyUrl) || sourceUrl,
      employmentType: normalizeWhitespace(job?.categories?.commitment),
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: toIsoDateTime(job?.createdAt),
      closingDate: null,
      jobDescription: extractJobDescription(job),
      remoteStatus: toRemoteStatus(job?.workplaceType),
    }
  })

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createGateScraper = ({
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    now = defaultNow,
  } = {}) {
    const officialCareersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialCareersSignal(officialCareersHtml)) {
      throw new Error('Gate official Gate careers surface no longer matches the verified first-party careers page')
    }

    const leverBoardHtml = await fetchText(LEVER_BOARD_URL)

    if (!hasLeverBoardSignal(leverBoardHtml)) {
      throw new Error('Gate verified Gate public jobs surface no longer matches the known Lever board')
    }

    const leverJobs = await fetchJson(LEVER_ENDPOINT)

    return extractLeverJobs(leverJobs).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: OFFICIAL_CAREERS_URL,
      companyDomain: 'gate.com',
      atsPlatform: 'lever',
    }))
  },
})

export const run = async (options = {}) => createGateScraper().run(options)

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
