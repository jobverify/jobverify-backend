import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import { CUBIC_TRANSPORTATION_SYSTEMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl
export const VERIFIED_JOB_DETAIL_URLS = [
  'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Program-Planner_REQ_48774-1',
  'https://cubic.wd1.myworkdayjobs.com/en-US/cubic_global_careers/job/Head-of-Technology-and-Service-Operations_REQ_48615-2',
]

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 20000,
})

const defaultFetchJson = (url, body) => fetchJsonWithRetry(url, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    'content-type': 'application/json',
  },
  body,
  label: `${SOURCE}-json`,
  timeoutMs: 20000,
})

const buildJobsRequestBody = () => JSON.stringify({
  appliedFacets: {},
  limit: 20,
  offset: 0,
  searchText: '',
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return text.includes("Become a part of a global team that's shaping the future.")
    && text.includes('Cubic Transportation Systems')
    && new RegExp(`href=["']${WORKDAY_BOARD_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(page)
  }

export const hasOfficialWorkdayBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /<link\s+rel=["']canonical["']\s+href=["']https:\/\/cubic\.wd1\.myworkdayjobs\.com\/cubic_global_careers["']/i.test(page)
    && /Global\.Innovative\.Trusted/i.test(page)
  }

export const hasVerifiedCtsJobDetailSignal = (html = '') => {
  const text = normalizeWhitespace(html)
  return text.includes('Program Planner')
    && text.includes('Business Unit: Cubic Transportation Systems')
    && text.includes('Hyderabad, Telangana')
  }

export const isBlockedWorkdayApiPayload = (payload = {}) =>
  String(payload?.errorCode ?? '').toUpperCase() === 'HTTP_500'
  && Number(payload?.httpStatus) === 500

export const createCubicTransportationSystemsScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Cubic careers page no longer matches the trusted first-party surface')
    }

    const boardHtml = await fetchText(WORKDAY_BOARD_URL)
    if (!hasOfficialWorkdayBoardSignal(boardHtml)) {
      throw new Error('The verified Cubic Workday board no longer matches the trusted public surface')
    }

    const verifiedJobHtml = await fetchText(VERIFIED_JOB_DETAIL_URLS[0])
    if (!hasVerifiedCtsJobDetailSignal(verifiedJobHtml)) {
      throw new Error('The verified CTS job detail page no longer matches the trusted public surface')
    }

    const payload = await fetchJson(JOBS_API_URL, buildJobsRequestBody())
    if (!isBlockedWorkdayApiPayload(payload)) {
      throw new Error('Cubic Transportation Systems Workday enumeration contract changed; review before enabling live extraction')
    }

    return []
  },
})

export const run = async (options = {}) => createCubicTransportationSystemsScraper(options).run(options)

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
