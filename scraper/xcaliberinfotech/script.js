import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'xcaliberinfotech'
export const COMPANY = 'Xcaliber Infotech'
export const HOMEPAGE_URL = 'https://xcaliberinfotech.com/'
export const CAREERS_URL = 'https://xcaliberinfotech.com/search-jobs/'
export const COMPANY_DOMAIN = 'xcaliberinfotech.com'
export const ATS_PLATFORM = 'sucuri-blocked-first-party-careers-shell'
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

export const hasVerifiedBlockedCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*You are being redirected\.\.\.\s*<\/title>/i.test(page)
    && /Javascript is required\./i.test(page)
    && /sucuri_cloudproxy_js/i.test(page)
}

export const createXcaliberInfotechScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedBlockedCareersSignal(careersHtml)) {
      throw new Error('Xcaliber Infotech verified first-party careers shell changed materially and no longer matches the blocked public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createXcaliberInfotechScraper().run(options)

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
