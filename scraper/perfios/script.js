import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'perfios'
export const CAREERS_PAGE_URL = 'https://perfios.ai/careers/'
export const DARWINBOX_URL = 'https://perfios.darwinbox.in/'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const hasDarwinboxHandoff = (html) => /perfios\.darwinbox\.in/i.test(String(html ?? ''))
const isDarwinboxLoginOnly = (html) => (
  /<title[^>]*>\s*Perfios\s*:\s*Login\s*<\/title>/i.test(String(html ?? ''))
  && /single sign on/i.test(String(html ?? ''))
  && /Perfios SSO/i.test(String(html ?? ''))
)

export const createPerfiosScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasDarwinboxHandoff(careersHtml)) {
      throw new Error('Perfios first-party careers page changed; refusing to assume no public listings')
    }

    const darwinboxHtml = await fetchText(DARWINBOX_URL)
    if (!isDarwinboxLoginOnly(darwinboxHtml)) {
      throw new Error('Perfios public Darwinbox surface changed; refusing to assume no public listings')
    }

    return []
  },
})

export const run = async (options = {}) => createPerfiosScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
