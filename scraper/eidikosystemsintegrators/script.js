import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import EIDIKO_SYSTEMS_INTEGRATORS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = EIDIKO_SYSTEMS_INTEGRATORS_CATALOG.source
export const COMPANY = EIDIKO_SYSTEMS_INTEGRATORS_CATALOG.companyName
export const CAREERS_URL = EIDIKO_SYSTEMS_INTEGRATORS_CATALOG.companyCareerPage
export const CANDIDATE_ROUTE_URLS = EIDIKO_SYSTEMS_INTEGRATORS_CATALOG.candidateRouteUrls

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const isTrustedNotFound = (error) => {
  const message = String(error?.message ?? error)
  return message.includes('404')
}

export const hasPublicJobsSurfaceSignal = (html = '') =>
  /\b(current openings|open positions|job openings|apply now)\b/i.test(String(html ?? ''))
    || /https?:\/\/eidiko\.com\/(?:careers|jobs)\/[a-z0-9-]+/i.test(String(html ?? ''))

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  for (const url of CANDIDATE_ROUTE_URLS) {
    try {
      const html = await fetchText(url)
      if (hasPublicJobsSurfaceSignal(html)) {
        throw new Error('Eidiko Systems Integrators now exposes a public jobs surface')
      }
    } catch (error) {
      if (isTrustedNotFound(error)) {
        continue
      }

      throw error
    }
  }

  return []
}

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
