import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { QBSS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = QBSS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const WORKING_AT_URL = PROVIDER_METADATA.workingAtUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeText = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined

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

export const hasBlockedFirstPartySignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('attention required! | cloudflare')
    && normalized.includes('sorry, you have been blocked')
    && normalized.includes('please enable cookies')
}

export const hasPublicJobSignals = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('career opportunities')
    || normalized.includes('apply now')
    || /href=["'][^"']*\/careers\/[^"']+/i.test(String(html ?? ''))
  }

export const createQbssScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const pages = []

    for (const url of [CAREERS_URL, WORKING_AT_URL]) {
      const page = await fetchPage(url)
      pages.push(page)

      if (hasPublicJobSignals(page.html)) {
        throw new Error('Qbss first-party careers surface is now publicly enumerable and needs a structured scraper')
      }

      if (!hasBlockedFirstPartySignal(page.html)) {
        throw new Error('Qbss first-party careers block signature changed and needs review')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createQbssScraper().run(options)

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
