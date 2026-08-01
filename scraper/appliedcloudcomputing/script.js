import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../../scraper-support/apiPortal/engine.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import {
  APPLIED_CLOUD_COMPUTING_CATALOG,
  BOARD_URL,
} from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = APPLIED_CLOUD_COMPUTING_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export { BOARD_URL }

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const createApiProvider = () => PROVIDER_METADATA

export const hasVerifiedBoardSignal = (html = '') => {
  const page = String(html)
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Applied Cloud Computing')
    && normalized.includes('Careers at Applied Cloud Computing')
    && normalized.includes('Jobs at Applied Cloud Computing')
    && normalized.includes('Cloud Operations Engineer (GCP & Kubernetes)')
    && normalized.includes('L3 Cloud Engineer - Applied Cloud Computing')
    && /https:\/\/www\.appliedcloudcomputing\.com\//i.test(page)
  }

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: BOARD_URL,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAppliedCloudComputingScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const boardHtml = await fetchText(BOARD_URL)
    if (!hasVerifiedBoardSignal(boardHtml)) {
      throw new Error('Applied Cloud Computing verified SmartRecruiters board no longer matches the trusted exact-name contract')
    }

    const jobs = await runApiPortalScraper({
      provider: createApiProvider(),
      fetchJson,
    })

    return jobs
      .map((job) => ({
        ...job,
        department: typeof job.department === 'string' ? job.department : null,
      }))
      .sort((left, right) => left.title.localeCompare(right.title))
  },
})

export const run = async (options = {}) => createAppliedCloudComputingScraper(options).run(options)

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
