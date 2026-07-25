import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'germancentreforopensource'
export const COMPANY = 'German centre for open source'
export const HOMEPAGE_URL = 'https://www.zendis.de/'
export const CAREERS_URL = 'https://www.zendis.de/karriere'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERN =
  /\b(current openings|open roles|open positions|job openings|vacancies|stellenangebote|apply now|apply here|job description|view jobs|join our team)\b|jobs\.lever\.co|boards\.greenhouse\.io|job-boards\.greenhouse\.io|ashbyhq\.com|myworkdayjobs|workdayjobs|smartrecruiters|jobvite|workable\.com|personio\.[^"' ]*\/job/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const stripHtml = (value) => normalizeWhitespace(value)

const fetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialHomepageSignal = (html) => {
  const normalized = stripHtml(html).toLowerCase()

  return normalized.includes('zendis')
    && normalized.includes('digitale souveränität ist handlungsfähigkeit')
    && normalized.includes('zentrum für digitale souveränität der öffentlichen verwaltung')
    && (normalized.includes('karriere') || String(html ?? '').includes('/karriere'))
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = stripHtml(html).toLowerCase()

  return normalized.includes('digitale souveränität ist teamwork')
    && normalized.includes('offene stellen')
    && normalized.includes('recruiting kontakt')
    && normalized.includes('esther andré')
    && normalized.includes('recruiting@zendis.de')
}

export const hasPublicJobsSignal = (html) => PUBLIC_JOBS_SIGNAL_PATTERN.test(String(html ?? ''))

export const matchesVerifiedNoJobsSurface = (homepageHtml, careersHtml) =>
  hasOfficialHomepageSignal(homepageHtml)
  && hasOfficialCareersSignal(careersHtml)
  && !hasPublicJobsSignal(homepageHtml)
  && !hasPublicJobsSignal(careersHtml)

export const createGermanCentreForOpenSourceScraper = () => ({
  async run({ fetchText: fetchTextImpl = fetchText } = {}) {
    const homepageHtml = await fetchTextImpl(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('ZenDiS homepage no longer matches the verified official public surface')
    }

    const careersHtml = await fetchTextImpl(CAREERS_URL)

    if (hasPublicJobsSignal(homepageHtml) || hasPublicJobsSignal(careersHtml)) {
      throw new Error('ZenDiS public careers page now appears to expose job listings')
    }

    if (!matchesVerifiedNoJobsSurface(homepageHtml, careersHtml)) {
      throw new Error('ZenDiS careers page no longer matches the verified no-listings public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createGermanCentreForOpenSourceScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running ${COMPANY} scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
