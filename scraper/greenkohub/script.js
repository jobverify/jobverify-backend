import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDarwinboxScraper } from '../darwinbox/script.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const COMPANY_NAME = 'Greenko Hub'
export const SOURCE = 'greenkohub'
export const DARWINBOX_COMPANY_ID = 'main'
export const DARWINBOX_ORIGIN = 'https://greenkogroup.darwinbox.in'
export const OFFICIAL_HOMEPAGE_URL = 'https://www.greenkogroup.com/'
export const PUBLIC_JOBS_URL =
  `${DARWINBOX_ORIGIN}/ms/candidatev2/${DARWINBOX_COMPANY_ID}/careers/allJobs`

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const darwinboxScraper = createDarwinboxScraper({
  companyName: COMPANY_NAME,
  source: SOURCE,
  companyId: DARWINBOX_COMPANY_ID,
  origin: DARWINBOX_ORIGIN,
})

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const normalizeOutputLocation = (value) => normalizeWhitespace(value)?.replace(/\s+,/g, ',') || null

const extractTitle = (html) => {
  const match = String(html ?? '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const extractOfficialPublicJobsUrl = (html = '') => {
  const match = String(html ?? '').match(
    /https:\/\/greenkogroup\.darwinbox\.in\/ms\/candidatev2\/main\/careers\/allJobs/i,
  )

  return normalizeWhitespace(match?.[0])
}

export const hasOfficialGreenkoHubHomepageSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return extractTitle(page) === 'Greenko Group'
    && text.includes('India’s First Dispatchable Renewables Company')
    && text.includes('Making Green Sustainable')
    && text.includes('info@greenkogroup.com')
    && extractOfficialPublicJobsUrl(page) === PUBLIC_JOBS_URL
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'greenkohub-official',
  timeoutMs: 15000,
})

export const createGreenkoHubScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    maxPages = config.maxPages,
    fetchText = defaultFetchText,
    fetchListingPage,
  } = {}) {
    const homepageHtml = await fetchText(OFFICIAL_HOMEPAGE_URL)

    if (!hasOfficialGreenkoHubHomepageSignals(homepageHtml)) {
      throw new Error('Greenko Hub verified official homepage no longer matches the verified public jobs surface')
    }

    const jobs = await darwinboxScraper.run({
      maxPages,
      maxJobs,
      fetchListingPage,
    })
    const scrapedAt = now()

    return jobs.map((job) => ({
      ...job,
      location: normalizeOutputLocation(job.location),
      scrapedAt,
    }))
  },
})

export const run = async (options = {}) => createGreenkoHubScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Greenko Hub scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log('Dry run - wrote jobs to jobs.json')
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
