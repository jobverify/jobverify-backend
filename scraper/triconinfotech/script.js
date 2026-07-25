import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import TRICON_INFOTECH_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = TRICON_INFOTECH_CATALOG.source
export const COMPANY = TRICON_INFOTECH_CATALOG.companyName
export const CAREERS_URL = TRICON_INFOTECH_CATALOG.companyCareerPage
export const JOBS_API_URL = TRICON_INFOTECH_CATALOG.jobsApiUrl

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: `${SOURCE}-html`,
    timeoutMs: 15000,
  })

const defaultFetchJson = (url) =>
  fetchJsonWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    label: `${SOURCE}-json`,
    timeoutMs: 15000,
  })

export const hasVerifiedAwsmShellSignal = (html = '') =>
  /awsm_job_openings/i.test(String(html ?? ''))
    && /awsmJobsPublic/i.test(String(html ?? ''))

export const hasPublicJobsSurfaceSignal = (html = '', payload = []) =>
  /awsm-b-job-post-title/i.test(String(html ?? ''))
    || /https?:\/\/www\.triconinfotech\.com\/jobs\/[a-z0-9-]+\/?/i.test(String(html ?? ''))
    || (Array.isArray(payload) && payload.length > 0)

export const run = async ({
  fetchText = defaultFetchText,
  fetchJson = defaultFetchJson,
} = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  const payload = await fetchJson(JOBS_API_URL)

  if (hasPublicJobsSurfaceSignal(careersHtml, payload)) {
    throw new Error('Tricon Infotech now exposes a public jobs surface')
  }

  if (!hasVerifiedAwsmShellSignal(careersHtml)) {
    throw new Error('The verified Tricon Infotech AWSM careers shell no longer matches the empty-shell contract')
  }

  return []
}

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
