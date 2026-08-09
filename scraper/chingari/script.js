import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_PAGE_URL = 'https://careers.chingari.io/career/'
export const CAREERS_CATEGORY_API_URL =
  'https://careers.chingari.io/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count'
export const CAREERS_POSTS_API_URL =
  'https://careers.chingari.io/wp-json/wp/v2/posts?per_page=100&_fields=id,date,date_gmt,link,slug,title,content,categories'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/section|\/h[1-6])\b[^>]*>/gi, ' ')
    .replace(/<p\b[^>]*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const toIsoDate = (value, { assumeUtc = false } = {}) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null

  const candidate = assumeUtc && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(normalized)
    ? `${normalized}Z`
    : normalized

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const inferCity = (location) => normalizeWhitespace(location)?.split(',')[0] || null

const inferRemoteStatus = (location) => {
  const normalized = normalizeWhitespace(location)?.toLowerCase() || ''
  if (normalized.includes('remote')) return 'Remote'
  if (normalized.includes('hybrid')) return 'Hybrid'
  return 'On-site'
}

const extractLocationFromDetail = (html) => {
  const text = stripTags(html)
  return normalizeWhitespace(text?.match(/\bLocation\s*:\s*([^|.]+)/i)?.[1]) || null
}

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /careers\.chingari\.io\/career\//i.test(page)
    && /(wp-json|wordpress|career)/i.test(page)
}

export const extractCareerPosts = (records = [], { categoryMap = new Map(), detailPages = new Map() } = {}) => (
  records
    .map((record) => {
      const sourceUrl = normalizeWhitespace(record?.link)
      const detailHtml = sourceUrl ? detailPages.get(sourceUrl) : null
      const location = extractLocationFromDetail(detailHtml)
      const department = Array.isArray(record?.categories)
        ? normalizeWhitespace(categoryMap.get(record.categories.find((id) => categoryMap.has(id))))
        : null

      return {
        title: normalizeWhitespace(record?.title?.rendered),
        company: 'Chingari',
        department,
        location,
        city: inferCity(location),
        country: location ? 'India' : null,
        jobId: normalizeWhitespace(record?.id),
        requisitionId: normalizeWhitespace(record?.id),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: toIsoDate(record?.date_gmt, { assumeUtc: true }) || toIsoDate(record?.date),
        closingDate: null,
        jobDescription: stripTags(record?.content?.rendered),
        remoteStatus: inferRemoteStatus(location),
      }
    })
    .filter((job) => job.title && job.jobId && job.sourceUrl)
)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'chingari',
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
  },
  label: 'chingari',
  timeoutMs: 15000,
})

export const createChingariScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('verified Chingari careers surface no longer matches the official public careers page')
    }

    const categories = await fetchJson(CAREERS_CATEGORY_API_URL)
    const posts = await fetchJson(CAREERS_POSTS_API_URL)
    const categoryMap = new Map(
      (Array.isArray(categories) ? categories : [])
        .map((record) => [record?.id, normalizeWhitespace(record?.name)]),
    )
    const records = Array.isArray(posts) ? posts : []
    const detailPages = new Map()

    for (const record of records) {
      const detailUrl = normalizeWhitespace(record?.link)
      if (!detailUrl) continue
      detailPages.set(detailUrl, await fetchText(detailUrl))
    }

    const jobs = extractCareerPosts(records, { categoryMap, detailPages })
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: 'chingari',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createChingariScraper(options).run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'chingari')
}
