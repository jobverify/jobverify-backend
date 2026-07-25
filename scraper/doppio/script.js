import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'doppio'
export const COMPANY = 'Doppio'
export const VACANCIES_PAGE_URL = 'https://www.doppio-espresso.nl/category/vacatures/'
export const CAREERS_PAGE_URL = 'https://www.doppio-espresso.nl/werken-bij-doppio/'
export const VACANCY_CATEGORY_API_URL = 'https://www.doppio-espresso.nl/wp-json/wp/v2/categories?slug=vacatures&_fields=id,name,slug,count'

export const buildVacancyPostsApiUrl = (vacancyCategoryId) =>
  `https://www.doppio-espresso.nl/wp-json/wp/v2/posts?categories=${vacancyCategoryId}&per_page=20&_fields=id,date,date_gmt,link,title,content,status,categories`

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#038;|&amp;/gi, '&')
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&#8217;|&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number(codePoint)))
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const htmlToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/article|\/section|\/h[1-6])\b[^>]*>/gi, '. ')
    .replace(/<p\b[^>]*>/gi, '')
    .replace(/<div\b[^>]*>/gi, '')
    .replace(/<li\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value, { assumeUtc = false } = {}) => {
  if (!value) return null

  const normalizedValue = assumeUtc && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(String(value))
    ? `${value}Z`
    : value

  const date = new Date(normalizedValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

const inferLocationFromTitle = (title) => {
  const normalized = normalizeWhitespace(title)
  if (!normalized) return null

  const locationMatch = normalized.match(/\bDoppio\s+(.+)$/i)
  return normalizeWhitespace(locationMatch?.[1]) || null
}

const formatLocation = (city) => {
  const normalizedCity = normalizeWhitespace(city)
  if (!normalizedCity) return null
  return /netherlands/i.test(normalizedCity)
    ? normalizedCity
    : `${normalizedCity}, Netherlands`
}

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  if (/^full[\s-]*time$/i.test(normalized)) return 'Full Time'
  if (/^part[\s-]*time$/i.test(normalized)) return 'Part Time'
  return normalized
}

const extractEmploymentType = (renderedContent) => {
  const explicitMatch = String(renderedContent ?? '').match(/\b(full[\s-]*time|part[\s-]*time)\b\s*\|/i)
  if (explicitMatch) {
    return normalizeEmploymentType(explicitMatch[1])
  }

  const normalized = normalizeWhitespace(renderedContent)
  if (!normalized) return null
  if (/\bfull[\s-]*time\b/i.test(normalized)) return 'Full Time'
  if (/\bpart[\s-]*time\b/i.test(normalized)) return 'Part Time'
  return null
}

export const extractVacancyCategoryId = (records = []) => {
  const matchingRecord = records.find(
    (record) => normalizeWhitespace(record?.slug)?.toLowerCase() === 'vacatures',
  )

  return Number.isInteger(matchingRecord?.id) ? matchingRecord.id : null
}

export const extractVacancyPosts = (records = []) =>
  records
    .filter((record) => normalizeWhitespace(record?.status)?.toLowerCase() === 'publish')
    .map((record) => {
      const title = normalizeWhitespace(record?.title?.rendered)
      const sourceUrl = normalizeWhitespace(record?.link)
      const locationCity = inferLocationFromTitle(title)
      const location = formatLocation(locationCity)

      if (!title || !sourceUrl || !record?.id) {
        return null
      }

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city: locationCity,
        country: location ? 'Netherlands' : null,
        jobId: String(record.id),
        requisitionId: String(record.id),
        sourceUrl,
        applyUrl: CAREERS_PAGE_URL,
        employmentType: extractEmploymentType(record?.content?.rendered),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: toIsoDate(record?.date_gmt, { assumeUtc: true }) || toIsoDate(record?.date),
        closingDate: null,
        jobDescription: htmlToText(record?.content?.rendered),
      }
    })
    .filter(Boolean)

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createDoppioScraper = () => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const categories = await fetchJson(VACANCY_CATEGORY_API_URL)
    const vacancyCategoryId = extractVacancyCategoryId(Array.isArray(categories) ? categories : [])

    if (!vacancyCategoryId) {
      return []
    }

    const records = await fetchJson(buildVacancyPostsApiUrl(vacancyCategoryId))
    const jobs = extractVacancyPosts(Array.isArray(records) ? records : [])

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || CAREERS_PAGE_URL,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createDoppioScraper().run(options)

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
