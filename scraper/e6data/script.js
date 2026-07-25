import path from 'path'
import { fileURLToPath } from 'url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://www.e6data.com/'
export const CAREERS_ROUTE_URL = 'https://www.e6data.com/careers'
export const CAREER_ROUTE_URL = 'https://www.e6data.com/career'
export const JOBS_ROUTE_URL = 'https://www.e6data.com/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const OFFICIAL_HOMEPAGE_TITLE_PATTERN =
  /<title>\s*e6data:\s*10x Faster Lakehouse Queries at 60% Lower Cost\s*\|\s*SQL & AI Engine\s*<\/title>/i
const OFFICIAL_HOMEPAGE_HERO_PATTERN =
  /Compute Engine for Iceberg,\s*Delta Lake,\s*Hudi:\s*Query\s*\|\s*ETL\s*\|\s*Ingestion/i
const OFFICIAL_HOMEPAGE_PRODUCT_PATTERN = /The only engine built for the Agentic AI era/i
const CAREERS_SIGNAL_PATTERN =
  /\b(career|careers|open positions|job opening|job openings|join us|join our team|work with us|we are hiring|hiring now)\b/i
const MISSING_ROUTE_PATTERN = /\b404\b|\bpage not found\b|\bcould not be found\b|\bnot found\b/i

const normalizeText = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return OFFICIAL_HOMEPAGE_TITLE_PATTERN.test(page)
    && OFFICIAL_HOMEPAGE_HERO_PATTERN.test(page)
    && OFFICIAL_HOMEPAGE_PRODUCT_PATTERN.test(page)
}

export const hasHomepageCareersSignal = (html) =>
  CAREERS_SIGNAL_PATTERN.test(normalizeText(html).toLowerCase())

export const hasMissingRouteSignal = ({ status, html }) => {
  const normalized = normalizeText(html).toLowerCase()

  return status === 404
    && MISSING_ROUTE_PATTERN.test(normalized)
    && !hasHomepageCareersSignal(normalized)
}

export const createE6DataScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('e6data homepage no longer matches the verified official public surface')
    }

    if (hasHomepageCareersSignal(homepage.html)) {
      throw new Error('e6data homepage now appears to expose a public careers surface')
    }

    const routes = await Promise.all([
      fetchPage(CAREERS_ROUTE_URL),
      fetchPage(CAREER_ROUTE_URL),
      fetchPage(JOBS_ROUTE_URL),
    ])

    if (!routes.every(hasMissingRouteSignal)) {
      throw new Error('e6data public careers surface changed')
    }

    return []
  },
})

export const run = async () => createE6DataScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running e6data scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'e6data')
    console.log('DB result:', result)
    process.exit(0)
  }
}
