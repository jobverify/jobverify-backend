import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { KRG_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = KRG_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CURRENT_OPENINGS_URL = PROVIDER_METADATA.currentOpeningsUrl
export const EXTERNAL_BOARD_URL = PROVIDER_METADATA.externalBoardUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html = '') =>
  normalizeWhitespace(String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1])

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return extractTitle(page) === 'KRG Technologies'
    && page.includes('Jobs.aspx')
}

export const hasCurrentOpeningsSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return text.includes('Find Your Career. You Deserve it.')
    && text.includes('Current Openings')
    && page.includes(EXTERNAL_BOARD_URL)
}

export const createKrgTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('KRG Technologies official careers page no longer matches the verified first-party surface')
    }

    const openingsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(openingsHtml)) {
      throw new Error('KRG Technologies current openings page no longer matches the verified public handoff surface')
    }

    return []
  },
})

export const run = async (options = {}) => createKrgTechnologiesScraper().run(options)

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
