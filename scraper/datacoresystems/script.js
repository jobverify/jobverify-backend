import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import DATA_CORE_SYSTEMS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DATA_CORE_SYSTEMS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const JOBS_BOARD_URL = PROVIDER_METADATA.officialJobsBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialBambooHrBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /<meta[^>]+property=["']og:title["'][^>]+content=["']Current Openings["']/i.test(page)
    && /<meta[^>]+property=["']og:description["'][^>]+content=["']Take a look at the current openings at Data-Core System, Inc\./i.test(page)
    && /<meta[^>]+property=["']og:site_name["'][^>]+content=["']Data-Core System, Inc\.["']/i.test(page)
}

const toLocationLabel = (item = {}) => {
  const city = normalizeWhitespace(item?.location?.city)
  const state = normalizeWhitespace(item?.location?.state)
  return [city, state, 'United States'].filter(Boolean).join(', ') || 'United States'
}

const toCity = (item = {}) => normalizeWhitespace(item?.location?.city) || null

export const extractJobs = (payload = {}) => {
  const result = Array.isArray(payload?.result) ? payload.result : []

  return result
    .map((item) => {
      const jobId = normalizeWhitespace(item?.id)
      if (!jobId) return null

      const sourceUrl = `${JOBS_BOARD_URL}/${jobId}`

      return {
        title: normalizeWhitespace(item?.jobOpeningName),
        company: COMPANY,
        department: normalizeWhitespace(item?.departmentLabel) || null,
        location: toLocationLabel(item),
        city: toCity(item),
        country: 'United States',
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(item?.employmentStatusLabel) || null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: item?.isRemote ? 'Remote' : null,
      }
    })
    .filter((job) => job?.title && job?.sourceUrl)
}

export const createDataCoreSystemsScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const boardHtml = await fetchText(JOBS_BOARD_URL)
    if (!hasOfficialBambooHrBoardSignal(boardHtml)) {
      throw new Error('Data-Core Systems official BambooHR board no longer matches the trusted public surface')
    }

    const payload = await fetchJson(JOBS_API_URL)
    const jobs = extractJobs(payload)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createDataCoreSystemsScraper().run(options)

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
