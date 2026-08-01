import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { VIRINCHI_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = VIRINCHI_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /<title>\s*Careers\s*<\/title>/i.test(rawHtml)
    && /Virinchi is always looking to recruit exceptionally bright and outstanding people/i.test(rawHtml)
}

export const hasProfileSignupOnlySignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /profSignup\.php/i.test(rawHtml)
    && /Profile Sign Up/i.test(rawHtml)
    && /virinchi2015@gmail\.com/i.test(rawHtml)
}

export const createVirinchiTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml) || !hasProfileSignupOnlySignal(careersHtml)) {
      throw new Error('Virinchi verified careers page no longer matches the known fail-closed contract')
    }

    return []
  },
})

export const run = async (options = {}) => createVirinchiTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
