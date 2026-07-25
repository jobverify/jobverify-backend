import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lumen'
export const COMPANY_NAME = 'Lumen Technologies'
export const HOMEPAGE_URL = 'https://www.lumen.com/en-us/home.html'
export const CAREERS_URL = 'https://careers.lumen.com/careers?sort_by=hot&start=0'

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

const normalizeText = (value) => normalizeWhitespace(value)?.toLowerCase() || ''

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const stripHtml = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, '- ')
    .replace(/<[^>]+>/g, ' '),
)

const extractJsonObject = (text, marker = '"items"') => {
  const rawText = String(text ?? '')
  const start = rawText.indexOf(marker)
  if (start < 0) return null

  let openIndex = start
  while (openIndex > 0 && rawText[openIndex] !== '{') {
    openIndex -= 1
  }

  if (rawText[openIndex] !== '{') return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = openIndex; index < rawText.length; index += 1) {
    const char = rawText[index]

    if (escaped) {
      escaped = false
      continue
    }

    if (char === '\\') {
      escaped = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') depth += 1
    if (char === '}') depth -= 1

    if (depth === 0) {
      return rawText.slice(openIndex, index + 1)
    }
  }

  return null
}

const isIndiaLocation = (value) => /india/i.test(normalizeText(value))

const extractCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null
  if (/remote/i.test(normalized)) return 'Remote'
  return normalized.split(',')[0]?.trim() || null
}

const extractJobId = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  try {
    const pathParts = new URL(normalized).pathname.split('/').filter(Boolean)
    return pathParts.at(-1) || null
  } catch {
    return null
  }
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeText(value)
  if (!normalized) return null
  if (normalized.includes('full')) return 'Full-time'
  if (normalized.includes('part')) return 'Part-time'
  if (normalized.includes('intern')) return 'Internship'
  if (normalized.includes('contract')) return 'Contract'
  return normalizeWhitespace(value)
}

const buildJobCard = (item = {}) => {
  const title = normalizeWhitespace(item.title)
  const sourceUrl = normalizeWhitespace(item.url)
  const applyUrl = normalizeWhitespace(item.applyNowUrl || item.url)
  const location = normalizeWhitespace(item.location || item.primaryLocation)
  const jobId = extractJobId(applyUrl || sourceUrl)

  if (!title || !sourceUrl || !applyUrl || !location || !jobId) {
    return null
  }

  if (!isIndiaLocation(location) && !isIndiaLocation(item.primaryLocation)) {
    return null
  }

  return {
    title,
    company: COMPANY_NAME,
    department: normalizeWhitespace(item.jobFunction),
    location,
    city: extractCity(location),
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl,
    applyUrl,
    employmentType: normalizeEmploymentType(item.jobType),
    experienceRequired: normalizeWhitespace(item.experience),
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: normalizeWhitespace(item.publicationDate)?.slice(0, 10) || null,
    closingDate: null,
    jobDescription: null,
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*AI-Ready Networking\s*&(?:amp;)?\s*Secure Cloud Solutions \| Lumen Technologies\s*<\/title>/i.test(rawHtml)
    && /VIEW CAREERS/i.test(rawHtml)
    && /careers\.lumen\.com\/careers\?sort_by=hot&start=0/i.test(rawHtml)
    && /AI-Ready Networking\s*&(?:amp;)?\s*Secure Cloud Solutions/i.test(rawHtml)
}

export const hasVerifiedCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = stripHtml(rawHtml)

  return /<title>\s*Careers at Lumen Technologies\s*<\/title>/i.test(rawHtml)
    && /Challenge Accepted\./i.test(normalized || '')
    && /Build the Future\./i.test(normalized || '')
    && /View All Jobs/i.test(normalized || '')
    && /"totalNumber"\s*:\s*\d+/i.test(rawHtml)
    && /"items"\s*:\s*\[/i.test(rawHtml)
}

export const extractSearchResults = (html) => {
  const rawHtml = String(html ?? '')
  const payloadText = extractJsonObject(rawHtml, '"items"')

  if (!payloadText) {
    return []
  }

  let payload
  try {
    payload = JSON.parse(payloadText)
  } catch {
    return []
  }

  return Array.isArray(payload?.items)
    ? payload.items.map(buildJobCard).filter(Boolean)
    : []
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createLumenScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Lumen verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('Lumen verified careers page no longer matches the known first-party jobs surface')
    }

    return extractSearchResults(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createLumenScraper().run(options)

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
