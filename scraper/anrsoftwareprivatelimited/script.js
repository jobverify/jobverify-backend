import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /Career - ANR Software Pvt Ltd\./i.test(rawHtml)
    && /Current Job Openings/i.test(rawHtml)
    && /No vacancy for this position now\. Visit again!/i.test(rawHtml)
  }

export const createAnrsoftwareprivatelimitedScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('ANR verified contradictory careers page no longer matches the known fail-closed contract')
    }

    return []
  },
})

export const run = async (options = {}) => createAnrsoftwareprivatelimitedScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
