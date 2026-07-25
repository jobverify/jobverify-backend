import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import UNITED_ALLIANCE_TECHNOLOGY_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = UNITED_ALLIANCE_TECHNOLOGY_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const isExpectedDomainResolutionFailure = (error) => {
  const message = String(error?.message || error || '').toLowerCase()
  return message.includes('could not resolve host')
    || message.includes('enotfound')
    || message.includes('getaddrinfo')
    || message.includes('name or service not known')
  }

export const createUnitedAllianceTechnologyScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    try {
      await fetchText(OFFICIAL_CAREERS_URL)
    } catch (error) {
      if (isExpectedDomainResolutionFailure(error)) {
        return []
      }

      throw error
    }

    throw new Error('United Alliance Technology exact-name first-party domain became reachable and needs a dedicated scraper')
  },
})

export const run = async (options = {}) => createUnitedAllianceTechnologyScraper().run(options)

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
