import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://in.canon/en/consumer/web/career'
export const EXTERNAL_PORTAL_URL = 'https://career.asia.canon'
export const ORACLE_BOARD_URL = 'https://career.asia.canon/en/sites/CX_1'
export const ORACLE_API_ORIGIN = 'https://cmaonehr-iaeatj.fa.ocs.oraclecloud.com'
export const ORACLE_LISTING_URL = `${ORACLE_API_ORIGIN}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0`

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
    && /href=["']https:\/\/career\.asia\.canon\/?["']/i.test(String(html ?? ''))
  )
}

export const hasOracleBoardSignal = ({ status, url, html } = {}) => {
  const page = String(html ?? '')
  return status === 200
    && url === ORACLE_BOARD_URL
    && /<title>\s*Canon Career Site\s*<\/title>/i.test(page)
    && /<base\b[^>]*href=["']\/en\/sites\/CX_1["']/i.test(page)
    && /data-sitenumber=["']CX_1["']/i.test(page)
    && page.includes(`data-apibaseurl="${ORACLE_API_ORIGIN}:443"`)
}

export const hasVerifiedEmptyOracleInventory = ({ status, url, html } = {}) => {
  if (status !== 200 || url !== ORACLE_LISTING_URL) return false

  try {
    const payload = JSON.parse(String(html ?? ''))
    const inventory = payload?.items?.[0]
    return payload.items.length === 1
      && inventory.SiteNumber === 'CX_1'
      && inventory.Location === null
      && inventory.TotalJobsCount === 0
      && Array.isArray(inventory.requisitionList)
      && inventory.requisitionList.length === 0
  } catch {
    return false
  }
}

export const extractOpenings = () => []

export const createCanonIndiaScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const fetchPage = options.fetchPage || defaultFetchPage
    const careerPage = await fetchPage(CAREER_PAGE_URL)

    if (careerPage.status !== 200 || !hasCareerPageSignal(careerPage.html)) {
      throw new Error('Canon India first-party careers handoff no longer matches the verified surface')
    }

    const portalPage = await fetchPage(EXTERNAL_PORTAL_URL)
    if (!hasOracleBoardSignal(portalPage)) {
      throw new Error('Canon India external careers handoff no longer resolves to the verified Oracle board')
    }

    const inventoryPage = await fetchPage(ORACLE_LISTING_URL)
    if (!hasVerifiedEmptyOracleInventory(inventoryPage)) {
      throw new Error('Canon India Oracle career inventory changed or is unavailable')
    }

    const jobs = extractOpenings()
    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createCanonIndiaScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
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
