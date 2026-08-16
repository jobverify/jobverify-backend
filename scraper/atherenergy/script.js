import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_HOME_URL = 'https://careers.atherenergy.com/'
export const ALL_JOBS_URL = 'https://careers.atherenergy.com/jobs'

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const CAREERS_HOME_SIGNAL_PATTERN = /Be the Story\s*\|\s*Join Ather|Careers at Ather|href=["']\/jobs["']/i
const ALL_JOBS_SIGNAL_PATTERN = /All Jobs\s*\|\s*Careers at Ather|<h1[^>]*>\s*All jobs\s*<\/h1>/i
const NO_OPEN_JOBS_PATTERN = /No open jobs in this team\s*\/\s*location right now|Check back in later for the right fit/i

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
      'Accept-Language': 'en-IN,en-US;q=0.9,en;q=0.8',
      Referer: CAREERS_HOME_URL,
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

const isHttpStatusError = (error, statusCode, url) => {
  const escapedUrl = String(url).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`HTTP\\s+${statusCode}\\b[\\s\\S]*${escapedUrl}`, 'i')
    .test(String(error?.message ?? error ?? ''))
}

const isDeterministicHttpBlock = (error) =>
  /HTTP\s+(?:401|403|404|410|451)\b/i.test(String(error?.message ?? error ?? ''))

const wrapApiOnlyFetchError = (url, error) => {
  const wrapped = new Error(
    `Ather Energy API-only migration could not fetch ${url}: ${error?.message ?? error}`,
    { cause: error },
  )

  for (const key of ['abortRetries', 'softFailure', 'upstreamOutage', 'failureKind', 'localTimeout', 'retryDelayMs']) {
    if (error?.[key] != null) {
      wrapped[key] = error[key]
    }
  }

  if (wrapped.abortRetries !== true && isDeterministicHttpBlock(error)) {
    wrapped.abortRetries = true
    wrapped.softFailure ??= true
    wrapped.upstreamOutage ??= true
    wrapped.failureKind ??= 'network_or_timeout'
  }

  return wrapped
}

const buildHttpStatusError = ({ status, url }) => {
  const error = new Error(`HTTP ${status} for ${url}`)
  error.status = status
  if ([401, 403, 404, 410, 451].includes(status)) {
    error.abortRetries = true
  }
  return error
}

export const hasCareersHomeSignal = (html) =>
  CAREERS_HOME_SIGNAL_PATTERN.test(String(html || ''))

export const hasJobsPageSignal = (html) =>
  ALL_JOBS_SIGNAL_PATTERN.test(String(html || ''))

export const hasNoOpenJobsSignal = (html) =>
  hasJobsPageSignal(html) && NO_OPEN_JOBS_PATTERN.test(String(html || ''))

export const hasCloudflareBlockSignal = (page = {}) => {
  const html = String(page.html ?? '')
  const text = normalizeWhitespace(html)
  const url = String(page.url || '')

  return Number(page.status) === 403
    && (url === CAREERS_HOME_URL || url === ALL_JOBS_URL)
    && /<title>\s*Attention Required!\s*\|\s*Cloudflare\s*<\/title>/i.test(html)
    && text.includes('Please enable cookies.')
    && text.includes('Sorry, you have been blocked')
    && (
      text.includes('unable to access atherenergy.com')
      || text.includes('unable to access careers.atherenergy.com')
    )
}

export const extractJobs = (html) => {
  if (!hasJobsPageSignal(html)) {
    return []
  }

  if (hasNoOpenJobsSignal(html)) {
    return []
  }

  return []
}

export const createAtherEnergyScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run(options = {}) {
    const loadPage = typeof options.fetchPage === 'function'
      ? options.fetchPage
      : typeof options.fetchText === 'function'
        ? createFetchPageFromText(options.fetchText)
        : defaultFetchPage

    let careersHomePage = null
    try {
      careersHomePage = await loadPage(CAREERS_HOME_URL)
    } catch (error) {
      if (!isHttpStatusError(error, 403, CAREERS_HOME_URL)) {
        throw error
      }
    }

    let allJobsPage
    try {
      allJobsPage = await loadPage(ALL_JOBS_URL)
    } catch (error) {
      throw wrapApiOnlyFetchError(ALL_JOBS_URL, error)
    }

    if (careersHomePage && careersHomePage.status >= 400 && !hasCloudflareBlockSignal(careersHomePage)) {
      throw wrapApiOnlyFetchError(CAREERS_HOME_URL, buildHttpStatusError(careersHomePage))
    }

    if (allJobsPage.status >= 400 && hasCloudflareBlockSignal(allJobsPage)) {
      return []
    }

    if (allJobsPage.status >= 400) {
      throw wrapApiOnlyFetchError(ALL_JOBS_URL, buildHttpStatusError(allJobsPage))
    }

    const careersHomeHtml = careersHomePage?.html ?? null
    const allJobsHtml = allJobsPage.html ?? ''

    if (careersHomeHtml && !hasCloudflareBlockSignal(careersHomePage) && !hasCareersHomeSignal(careersHomeHtml)) {
      return []
    }

    if (!hasJobsPageSignal(allJobsHtml)) {
      return []
    }

    const jobs = extractJobs(allJobsHtml)

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createAtherEnergyScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Ather Energy scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'atherenergy')
    console.log('DB result:', result)
    process.exit(0)
  }
}
