import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREER_PAGE_URL = 'https://www.capillarytech.com/careers/'

const PENDING_CAREERS_PATTERN = /hand-crafting a brand-new careers experience[\s\S]*?live soon/i
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  })

  return {
    status: response.status,
    url: response.url || url,
    html: await response.text(),
  }
}

const createFetchPageFromText = (fetchText) => async (url) => ({
  status: 200,
  url,
  html: await fetchText(url),
})

export const isCareersExperiencePending = (html) => PENDING_CAREERS_PATTERN.test(html || '')

export const hasCloudflareBlockSignal = (page = {}) => {
  const html = String(page.html ?? '')
  const text = normalizeWhitespace(html)

  return Number(page.status) === 403
    && String(page.url || '') === CAREER_PAGE_URL
    && /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(html)
    && (
      text.includes('Enable JavaScript and cookies to continue')
      || text.includes('Checking your browser...')
    )
}

export const createCapillaryTechnologiesScraper = () => ({
  async run(options = {}) {
    const loadPage = typeof options.fetchPage === 'function'
      ? options.fetchPage
      : typeof options.fetchText === 'function'
        ? createFetchPageFromText(options.fetchText)
        : defaultFetchPage
    const careersPage = await loadPage(CAREER_PAGE_URL)
    const careersHtml = careersPage.html ?? ''

    if (hasCloudflareBlockSignal(careersPage)) {
      return []
    }

    if (careersPage.status !== 200) {
      throw new Error(`HTTP ${careersPage.status} for ${CAREER_PAGE_URL}`)
    }

    if (!isCareersExperiencePending(careersHtml)) {
      throw new Error('Capillary Technologies careers page changed; scraper needs an update')
    }

    return []
  },
})

export const run = async () => createCapillaryTechnologiesScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Capillary Technologies scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'capillarytechnologies')
    console.log('DB result:', result)
    process.exit(0)
  }
}
