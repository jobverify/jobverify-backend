import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildApiUrl,
  buildPublicHeaders,
  DEFAULT_PAGE_SIZE,
  extractSearchResults,
} from '../larsentoubro/script.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { buildApiUrl, buildPublicHeaders, DEFAULT_PAGE_SIZE }

export const SOURCE = 'landtedutech'
export const COMPANY = 'L&T EduTech'
export const COMPANY_DOMAIN = 'lntedutech.com'
export const HOMEPAGE_URL = 'https://lntedutech.com/'
export const CAREERS_URL = 'https://larsentoubrocareers.peoplestrong.com/job/joblist'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  'building industry-ready talent',
  'l&t edutech leverages decades of expertise from l&t and its group companies',
  'recruitment automation and skill exchange platforms create enriching experiences',
  'l&t edutech | building value for learner, academia and industry',
  'an initiative of',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return 'India'
  if (/\bindia\b/i.test(normalized)) return normalized
  return `${normalized}, India`
}

const extractCity = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return normalized.replace(/,\s*India$/i, '').split(',')[0]?.trim() || null
}

const isEdutechRecord = (record = {}) => (
  /\bedutech\b/i.test(normalizeWhitespace(record.organizationUnit))
  || /\bedutech\b/i.test(normalizeWhitespace(record.organizationUnitComplete))
)

const isIndiaRecord = (record = {}) => {
  const candidates = [
    record.country,
    record.locationHierarchy,
    record.locationHierarchyComplete,
    ...(Array.isArray(record.countryList) ? record.countryList : []),
  ]

  return candidates.some((value) => /\bindia\b/i.test(normalizeWhitespace(value)))
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return HOMEPAGE_SIGNALS.every((signal) => normalized.includes(signal))
    && rawHtml.includes('https://larsentoubrocareers.peoplestrong.com/job/joblist')
    && /<title>\s*l&amp;t edutech \| building value for learner, academia and industry\s*<\/title>/i.test(rawHtml)
}

export const hasOfficialCareersShell = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Candidate Portal\s*<\/title>/i.test(rawHtml)
    && /<app-root\b[^>]*data-testid=["']src-index-app-root-page-1["']/i.test(rawHtml)
    && /candidate-portal/i.test(rawHtml)
    && /main-[A-Z0-9]+\.js/i.test(rawHtml)
}

export const extractEdutechJobs = (payload = {}) => {
  const filteredPayload = {
    ...payload,
    response: (Array.isArray(payload.response) ? payload.response : [])
      .filter((record) => isEdutechRecord(record) && isIndiaRecord(record)),
  }

  return extractSearchResults(filteredPayload).map((job) => {
    const location = normalizeLocation(job.location)

    return {
      ...job,
      company: COMPANY,
      location,
      city: extractCity(location),
      country: 'India',
      companyCareerPage: CAREERS_URL,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'peoplestrong',
    }
  })
}

export const createLandtEdutechScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    fetchJson = defaultFetchJson,
    pageSize = DEFAULT_PAGE_SIZE,
    maxPages = Number.POSITIVE_INFINITY,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('L&T EduTech verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (![200, 404].includes(careersPage.status) || !hasOfficialCareersShell(careersPage.html)) {
      throw new Error('L&T EduTech verified official careers shell no longer matches the known public surface')
    }

    const jobs = []

    for (let page = 0; page < maxPages; page += 1) {
      const offset = page * pageSize
      const payload = await fetchJson(buildApiUrl({ offset, limit: pageSize }), {
        method: 'POST',
        headers: buildPublicHeaders(),
        body: JSON.stringify({}),
      })

      const pageJobs = extractEdutechJobs(payload)
      jobs.push(...pageJobs.map((job) => ({
        ...job,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: new Date().toISOString(),
      })))

      const responseCount = Array.isArray(payload?.response) ? payload.response.length : 0
      const totalRecords = Number.parseInt(String(payload?.totalRecords ?? ''), 10)

      if (responseCount === 0) break
      if (Number.isFinite(totalRecords) && offset + responseCount >= totalRecords) break
    }

    return jobs
  },
})

export const run = async (options = {}) => createLandtEdutechScraper().run(options)

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
