import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import CIVICA_INDIA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = CIVICA_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKABLE_PAGE_URL = PROVIDER_METADATA.workablePageUrl
export const WORKABLE_LLMS_URL = PROVIDER_METADATA.workableLlmsUrl

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,text/plain,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Make your future part of ours/i.test(page)
    && /Our vacancies/i.test(page)
    && /apply\.workable\.com\/civica/i.test(page)
}

export const hasZeroOpeningsSignal = (text = '') => {
  const normalized = String(text ?? '')
  return /0 current openings/i.test(normalized)
    && /apply\.workable\.com\/civica\/jobs\.md/i.test(normalized)
}

export const createCivicaIndiaScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Civica India verified first-party careers page no longer matches the expected official handoff')
    }

    const llmsText = await fetchText(WORKABLE_LLMS_URL)
    if (!hasZeroOpeningsSignal(llmsText)) {
      throw new Error('Civica India zero-openings contract no longer matches the exact workable llms feed')
    }

    return []
  },
})

export const run = async (options = {}) => createCivicaIndiaScraper(options).run(options)

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
