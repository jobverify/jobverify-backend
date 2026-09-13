import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { BLAZECLAN_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BLAZECLAN_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const BROKEN_BOARD_URL = PROVIDER_METADATA.brokenBoardUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Join us to grow your career by doing what you love to do and treading the path where you want to go.')
    && /href=["']https:\/\/blazeclan\.zohorecruit\.in\/jobs\/Careers["'][^>]*class=["']cta-btn["']/i.test(String(html))
    && /Current Openings/i.test(String(html))
}

export const isBrokenZohoBoardPage = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('blazeclan.zohorecruit.in does not exist.')
    && normalized.includes('Powered by')
    && /zoho/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createBlazeclanTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Blazeclan Technologies verified work-with-us page no longer matches the trusted first-party contract')
    }

    const boardHtml = await fetchText(BROKEN_BOARD_URL)
    if (!isBrokenZohoBoardPage(boardHtml)) {
      throw new Error('Blazeclan Technologies current openings handoff no longer matches the verified dead-board state')
    }

    throw Object.assign(new Error('Blazeclan official Zoho handoff is unavailable: the tenant does not exist; no complete job snapshot can be established'), {
      code: 'BLAZECLAN_BOARD_UNAVAILABLE', failureKind: 'upstream_unavailable', softFailure: true, upstreamOutage: true, abortRetries: true,
    })
  },
})

export const run = async (options = {}) => createBlazeclanTechnologiesScraper().run(options)

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
