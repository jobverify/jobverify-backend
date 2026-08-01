import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeCity } from '../../scraper-support/utils/cityNormalizer.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nestdigital'
export const COMPANY = 'NeST Digital'
export const CAREERS_URL = 'https://nestdigital.com/career/'
export const JOBS_HOST_URL = 'https://careers.nestdigital.com/'

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
    .replace(/\r/g, '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/main|\/h[1-6]|\/a|\/span)\b[^>]*>/gi, ' ')
    .replace(/<(p|div|li|section|article|main|h[1-6]|a|span)\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const titleCase = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .split(' ')
  .filter(Boolean)
  .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
  .join(' ') || null

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const [cityPart, statePart] = normalized.split('-').map((part) => titleCase(part))
  if (!cityPart || !statePart) return null

  return `${cityPart}, ${statePart}, India`
}

const deriveCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized) return null

  const [firstPart] = normalized.split(',').map((part) => part.trim()).filter(Boolean)
  return normalizeCity(firstPart || normalized)
}

const getLatestJobsSection = (html) => String(html ?? '').match(
  /<h2>\s*Latest Jobs\s*<\/h2>([\s\S]*?)(?=<h2>|<\/main>)/i,
)?.[1] || null

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = stripTags(page) || ''

  return /Give Wings to your\s*dreams at NeST Digital!/i.test(text)
    && /EXPLORE NOW/i.test(text)
    && new RegExp(JOBS_HOST_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(page)
    && /Latest Jobs/i.test(text)
}

export const extractLatestJobs = (html) => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('NeST Digital careers page no longer matches the verified official public careers surface')
  }

  const latestJobsSection = getLatestJobsSection(html)
  if (!latestJobsSection) {
    throw new Error('NeST Digital careers page no longer exposes the verified latest jobs section')
  }

  const jobs = [...latestJobsSection.matchAll(/<a[^>]+href="(https:\/\/careers\.nestdigital\.com\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => {
      const sourceUrl = normalizeWhitespace(match[1])
      const cardHtml = String(match[2] ?? '')
      const metadata = [...cardHtml.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)]
        .map((item) => stripTags(item[1]))
        .filter(Boolean)
      const title = stripTags(cardHtml.replace(/<span[\s\S]*?<\/span>/gi, ' '))
      const [rawLocation, employmentType] = metadata
      const location = normalizeLocation(rawLocation)

      if (!title || !location || !employmentType || !sourceUrl) return null

      return {
        title,
        location,
        city: deriveCity(location),
        employmentType,
        sourceUrl,
        applyUrl: sourceUrl,
      }
    })
    .filter(Boolean)

  if (jobs.length === 0) {
    throw new Error('NeST Digital verified latest jobs cards changed or disappeared')
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

export const createNestDigitalScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractLatestJobs(html).map((job) => {
      const identitySlug = slugify(`${job.title}-${job.location}`)

      return {
        ...job,
        company: COMPANY,
        department: null,
        country: 'India',
        jobId: `${SOURCE}-${identitySlug}`,
        requisitionId: `${SOURCE}-${identitySlug}`,
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

export const run = async (options = {}) => createNestDigitalScraper().run(options)

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
