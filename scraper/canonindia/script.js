import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://in.canon/en/consumer/web/career'
export const EXTERNAL_PORTAL_URL = 'https://career.asia.canon:8086/psc/ps/EMPLOYEE/CIPLCAREER/c/HRS_HRAM.HRS_APP_SCHJOB.GBL?Page=HRS_APP_SCHJOB&Action=U&FOCUS=Applicant&SiteId=2226&'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasCareerPageSignal = (html) => {
  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''
  return (
    normalized.includes('careers - canon india')
    && normalized.includes('come join us')
    && normalized.includes('canon is a global brand')
  )
}

export const hasPortalBlockedSignal = ({ status, html }) => {
  const normalized = normalizeWhitespace(html)?.toLowerCase() || ''
  return status === 200 && normalized === 'no access'
}

export const extractOpenings = () => []

export const createCanonIndiaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const careerPage = await fetchPage(CAREER_PAGE_URL)

    if (!hasCareerPageSignal(careerPage.html)) {
      return []
    }

    const portalPage = await fetchPage(EXTERNAL_PORTAL_URL)
    if (!hasPortalBlockedSignal(portalPage)) {
      throw new Error('Canon India external careers portal no longer returns the expected current no-access state')
    }

    const jobs = extractOpenings()
    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createCanonIndiaScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Canon India scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'canonindia')
    console.log('DB result:', result)
    process.exit(0)
  }
}
