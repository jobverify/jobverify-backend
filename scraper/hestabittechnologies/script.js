import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'hestabittechnologies'
export const COMPANY = 'Hestabit Technologies'
export const HOMEPAGE_URL = 'https://www.hestabit.com/'
export const CAREERS_URL = 'https://www.hestabit.com/career'
export const COMPANY_DOMAIN = 'hestabit.com'
export const ATS_PLATFORM = 'first-party-careers-page-third-party-google-forms-handoff'
export const VERIFIED_ON = '2026-07-18'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: `${SOURCE}-html`,
    timeoutMs: 15000,
  })

export const hasVerifiedCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  return /Career\s*@\s*HestaBit/i.test(page)
    && /Senior PHP Developer/i.test(page)
    && /Associate PHP Developer/i.test(page)
    && /docs\.google\.com\/forms/i.test(page)
}

export const createHestabitTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Hestabit Technologies verified first-party careers page no longer matches the trusted fail-closed surface')
    }

    return []
  },
})

export const run = async (options = {}) => createHestabitTechnologiesScraper().run(options)

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
