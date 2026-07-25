import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SOLAR_INDUSTRIES_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SOLAR_INDUSTRIES_INDIA_CATALOG.source
export const COMPANY = SOLAR_INDUSTRIES_INDIA_CATALOG.companyName
export const HOMEPAGE_URL = SOLAR_INDUSTRIES_INDIA_CATALOG.officialHomepageUrl
export const CAREERS_BOARD_URL = SOLAR_INDUSTRIES_INDIA_CATALOG.companyCareerPage
export const SAMPLE_JOB_VIEW_URL = SOLAR_INDUSTRIES_INDIA_CATALOG.sampleJobViewUrl
export const VERIFIED_AT = SOLAR_INDUSTRIES_INDIA_CATALOG.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000
const TIMEOUT_ERROR_PATTERN = /timed out|timeout|etimedout|connect timeout|und_err_connect_timeout/i
const PUBLIC_BOARD_SIGNAL_PATTERN = /current openings|search jobs|apply\b|jobview|job openings|posted/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isTimeoutError = (error) => {
  if (error?.name === 'AbortError') return true

  const causeCode = String(error?.cause?.code ?? '')
  const causeMessage = String(error?.cause?.message ?? '')
  const message = String(error?.message ?? error ?? '')

  return /UND_ERR_CONNECT_TIMEOUT|ETIMEDOUT/i.test(causeCode)
    || TIMEOUT_ERROR_PATTERN.test(causeMessage)
    || TIMEOUT_ERROR_PATTERN.test(message)
}

const defaultFetchPage = async (url) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    })

    clearTimeout(timeout)

    return {
      status: response.status,
      url: response.url,
      html: await response.text(),
      errorKind: null,
    }
  } catch (error) {
    clearTimeout(timeout)

    if (isTimeoutError(error)) {
      return {
        status: null,
        url,
        html: null,
        errorKind: 'timeout',
      }
    }

    const cause = String(error?.cause ?? error?.message ?? error)
    if (/ENOTFOUND|getaddrinfo/i.test(cause)) {
      return {
        status: null,
        url,
        html: null,
        errorKind: 'dns',
      }
    }

    return {
      status: null,
      url,
      html: null,
      errorKind: 'network',
      errorMessage: String(error?.message ?? error),
    }
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Solar Group/i.test(rawHtml)
    && /Consolidating our Position on the Global Scale/i.test(normalized)
    && /\bCareers\b/i.test(normalized)
}

export const extractCareersBoardUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const candidateUrl = new URL(match[1], HOMEPAGE_URL).toString()
      if (candidateUrl.includes('careers.solargroup.com/solargroup/')) {
        return candidateUrl
      }
    } catch {
      continue
    }
  }

  return null
}

export const hasBlockedOrTimedOutSurface = (surface = {}) =>
  (surface?.errorKind === 'timeout'
    && !Number.isInteger(surface?.status)
    && surface?.html == null)
  || Number(surface?.status) === 403

export const hasUnexpectedPublicBoardSignal = (surface = {}) =>
  Number(surface?.status) === 200
  && PUBLIC_BOARD_SIGNAL_PATTERN.test(normalizeWhitespace(surface?.html))

export const createSolarIndustriesIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Solar Industries India verified homepage no longer matches the trusted public surface')
    }

    const careersBoardUrl = extractCareersBoardUrl(homepage.html)
    if (careersBoardUrl !== CAREERS_BOARD_URL) {
      throw new Error('Solar Industries India verified careers handoff no longer matches the trusted public surface')
    }

    const careersBoard = await fetchPage(CAREERS_BOARD_URL)
    if (hasUnexpectedPublicBoardSignal(careersBoard)) {
      throw new Error('Solar Industries India careers board surface no longer matches the verified blocked-or-timeout state')
    }

    if (!hasBlockedOrTimedOutSurface(careersBoard)) {
      throw new Error('Solar Industries India careers board surface no longer matches the verified blocked-or-timeout state')
    }

    const sampleJobView = await fetchPage(SAMPLE_JOB_VIEW_URL)
    if (hasUnexpectedPublicBoardSignal(sampleJobView)) {
      throw new Error('Solar Industries India sample jobview surface no longer matches the verified blocked-or-timeout state')
    }

    if (!hasBlockedOrTimedOutSurface(sampleJobView)) {
      throw new Error('Solar Industries India sample jobview surface no longer matches the verified blocked-or-timeout state')
    }

    return []
  },
})

export const run = async (options = {}) => createSolarIndustriesIndiaScraper().run(options)

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
