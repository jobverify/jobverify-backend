import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { RIVIGO_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = RIVIGO_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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

export const defaultFetchText = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(timeoutMs),
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedCareersPageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Careers\s*\|\s*Rivigo\s*<\/title>/i.test(rawHtml)
    && /href=["']https:\/\/(?:www\.)?rivigo\.com\/?["']/i.test(rawHtml)
    && /@Rivigo/i.test(rawHtml)
    && /We are building the next generation logistics platform\./i.test(rawHtml)
}

export const extractJobOpeningCounts = (html) => {
  const match = /Job Openings\s+(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/i.exec(String(html ?? ''))
  if (!match) return null

  return {
    start: Number(match[1]),
    end: Number(match[2]),
    total: Number(match[3]),
  }
}

export const hasVerifiedEmptyBoardSignals = (html) => {
  const counts = extractJobOpeningCounts(html)

  return hasVerifiedCareersPageSignal(html)
    && /No Requsitions Found/i.test(String(html ?? ''))
    && Boolean(counts)
    && counts.start === 0
    && counts.end === 0
    && counts.total === 0
}

export const hasPublicJobSignals = (html) => {
  const counts = extractJobOpeningCounts(html)
  return Boolean(counts && counts.total > 0)
}

export const createRivigoScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('Rivigo verified first-party careers surface no longer matches the known empty-board contract')
    }

    if (hasPublicJobSignals(careersHtml)) {
      throw new Error('Rivigo verified public jobs surface changed materially and now exposes openings')
    }

    if (!hasVerifiedEmptyBoardSignals(careersHtml)) {
      throw new Error('Rivigo verified empty-board careers surface no longer matches the known contract')
    }

    return []
  },
})

export const run = async (options = {}) => createRivigoScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
