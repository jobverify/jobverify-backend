import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.indo-mim.com/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'indomim',
  timeoutMs: 15000,
})

export const hasOfficialCareersSurface = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Career\s*-\s*INDO-MIM\s*<\/title>/i.test(page)
    && /CURRENT\s+OPENINGS/i.test(page)
    && /EX-EMPLOYEE\s+BGV/i.test(page)
    && /Explore\s+Opportunities/i.test(page)
    && /exempbgv@indo-\s*mim\.com/i.test(page)
    && /FIRST\s+NAME\s*\*/i.test(page)
    && /LAST\s+NAME\s*\*/i.test(page)
    && /EMAIL\s+ADDRESS\s*\*/i.test(page)
    && /TELL\s+MORE\s+ABOUT\s+YOU/i.test(page)
}

export const createIndoMimScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREER_PAGE_URL)

    if (!hasOfficialCareersSurface(careersHtml)) {
      throw new Error('INDO-MIM careers page no longer matches the verified public no-listings surface')
    }

    return []
  },
})

export const run = async () => createIndoMimScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'indomim')
  }
}
