import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'logicfruittechnologies'
export const COMPANY = 'Logic Fruit Technologies'
export const CAREERS_URL = 'https://www.logic-fruit.com/career/jobs-current-opening/'
export const APPLY_URL = 'https://www.logic-fruit.com/career/application-form/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&ndash;|&mdash;/gi, '-')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).href
  } catch {
    return null
  }
}

const normalizeLocation = (value) => {
  const normalized = stripTags(value)
  if (!normalized) return null

  const cleaned = normalized
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
    .trim()

  return /\bindia\b/i.test(cleaned) ? cleaned : `${cleaned}, India`
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [firstPart] = normalized.split('/').map((part) => part.split(',')[0]?.trim()).filter(Boolean)
  return normalizeCity(firstPart || normalized)
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /Create Your Future With Us!/i.test(text)
    && /Current Openings/i.test(text)
    && /Application Form/i.test(text)
    && /logic-fruit\.com/i.test(page)
}

export const extractOpenings = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error(
      'Logic Fruit Technologies verified official public careers surface no longer matches the expected page',
    )
  }

  const cards = [...String(html ?? '').matchAll(
    /<h[2-4][^>]*>\s*<a[^>]+href=["']([^"']+)["'][^>]*>\s*([\s\S]*?)\s*<\/a>\s*<\/h[2-4]>\s*([\s\S]{0,300}?)(?=<h[2-4]\b|<\/section>|<\/main>)/gi,
  )]

  const seen = new Set()
  const jobs = []

  for (const match of cards) {
    const sourceUrl = toAbsoluteUrl(match[1])
    const title = stripTags(match[2])
    const nearbyHtml = match[3]
    const locationMatch = nearbyHtml.match(/<(?:li|p|div|span)\b[^>]*>\s*([^<]+?)\s*<\/(?:li|p|div|span)>/i)
    const location = normalizeLocation(locationMatch?.[1])

    if (!title || !location || !sourceUrl) continue

    const dedupeKey = `${sourceUrl}::${location}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    jobs.push({
      title,
      location,
      city: deriveCity(location),
      sourceUrl,
      applyUrl: APPLY_URL,
      remoteStatus: 'On-site',
    })
  }

  if (jobs.length === 0) {
    throw new Error('Logic Fruit Technologies verified public openings changed or disappeared')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createLogicFruitTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractOpenings(html).map((job) => {
      const identitySlug = slugify(`${job.title}-${job.location}`)

      return {
        ...job,
        company: COMPANY,
        department: null,
        country: 'India',
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createLogicFruitTechnologiesScraper().run(options)

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
