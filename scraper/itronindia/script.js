import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runWorkdayScraper } from '../myworkday/engine.js'
import { ITRON_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = ITRON_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKDAY_BOARD_URL = PROVIDER_METADATA.officialWorkdayBoardUrl
export const INDIA_WORKDAY_URL = PROVIDER_METADATA.verifiedIndiaWorkdayUrl
export const LOCATION_COUNTRY = 'c4f78be1a8f14da0ab49ce1162348a5e'
export const WORKDAY_BOARD_ACCEPTED_URLS = [
  WORKDAY_BOARD_URL,
  'https://itron.wd5.myworkdayjobs.com/en-US/Itron',
  INDIA_WORKDAY_URL,
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return String(value ?? '').replace(/\/$/, '')
  }
}

const sameUrl = (left, right) => normalizeComparableUrl(left) === normalizeComparableUrl(right)

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
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const isAcceptedWorkdayBoardUrl = (value) =>
  WORKDAY_BOARD_ACCEPTED_URLS.some((candidate) => sameUrl(value, candidate))

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Careers\s*-\s*Itron\s*<\/title>/i.test(page)
    && /View Jobs in India/i.test(page)
    && /itron\.wd5\.myworkdayjobs\.com\/Itron\?locationCountry=c4f78be1a8f14da0ab49ce1162348a5e/i.test(page)
}

export const extractVerifiedIndiaWorkdayUrl = (html = '') => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    if (sameUrl(match[1], INDIA_WORKDAY_URL)) {
      return INDIA_WORKDAY_URL
    }
  }

  return null
}

export const hasOfficialWorkdayBoardSignal = (html = '') => {
  const page = String(html ?? '')

  return /rel=["']canonical["'][^>]*href=["']https:\/\/itron\.wd5\.myworkdayjobs\.com\/Itron["']/i.test(page)
    && /window\.workday\s*=\s*\{[^}]*"tenant"\s*:\s*"itron"/i.test(page)
    && /window\.workday\s*=\s*\{[^}]*"siteId"\s*:\s*"Itron"/i.test(page)
}

export const buildScraperOptions = () => ({
  company: COMPANY,
  baseUrl: INDIA_WORKDAY_URL,
  locationCountry: LOCATION_COUNTRY,
  source: SOURCE,
  scraperDir: currentDir,
})

export const createItronIndiaScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    workdayRunner = runWorkdayScraper,
  } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)
    if (
      careersPage.status !== 200
      || !sameUrl(careersPage.url, CAREERS_URL)
      || !hasOfficialCareersSignal(careersPage.html)
    ) {
      throw new Error('Itron India verified official careers surface changed materially')
    }

    const verifiedIndiaWorkdayUrl = extractVerifiedIndiaWorkdayUrl(careersPage.html)
    if (!sameUrl(verifiedIndiaWorkdayUrl, INDIA_WORKDAY_URL)) {
      throw new Error('Itron India verified India Workday handoff changed materially')
    }

    const workdayBoardPage = await fetchPage(verifiedIndiaWorkdayUrl)
    if (
      workdayBoardPage.status !== 200
      || !isAcceptedWorkdayBoardUrl(workdayBoardPage.url)
      || !hasOfficialWorkdayBoardSignal(workdayBoardPage.html)
    ) {
      throw new Error('Itron India verified public Workday board changed materially')
    }

    return workdayRunner(buildScraperOptions())
  },
})

export const run = async (options = {}) => createItronIndiaScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
