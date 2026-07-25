import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../utils/fetch.js'

import { IONIC_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = IONIC_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const LEVER_PROXY_URL = PROVIDER_METADATA.leverProxyUrl
export const LEVER_BOARD_URL = PROVIDER_METADATA.leverBoardUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const extractTitle = (html = '') => {
  const match = String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return normalizeWhitespace(match?.[1])
}

export const hasOfficialIonicCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = (normalizeWhitespace(page) || '').toLowerCase()
  const title = extractTitle(page) || ''

  return /^jobs$/i.test(title)
    && text.includes('help us change the way the world builds amazing apps')
    && text.includes('see open positions')
    && text.includes('open positions')
    && page.includes('joinus@ionic.io')
    && text.includes('an outsystems company')
}

export const extractLeverJobs = (payload = {}) => Array.isArray(payload?.data) ? payload.data : []

export const hasBrokenLeverProxySignal = (payload = {}) =>
  payload?.ok === true
  && !Array.isArray(payload?.data)
  && payload?.data?.ok === false
  && normalizeWhitespace(payload?.data?.error) === 'Document not found'

export const isMissingLeverBoardPage = (page = {}) =>
  Number(page?.status) === 404
  && /not found/i.test(normalizeWhitespace(page?.text) || '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url) => fetchJsonWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    finalUrl: response.url,
    text: await response.text(),
  }
}

export const createIonicScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
    fetchPage = defaultFetchPage,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialIonicCareersSignal(careersHtml)) {
      throw new Error(
        'Ionic verified first-party careers page no longer matches the trusted public surface',
      )
    }

    const leverProxyPayload = await fetchJson(LEVER_PROXY_URL)
    const liveJobs = extractLeverJobs(leverProxyPayload)
    if (liveJobs.length > 0) {
      throw new Error('Ionic careers surface now exposes a public jobs feed')
    }

    if (!hasBrokenLeverProxySignal(leverProxyPayload)) {
      throw new Error(
        'Ionic first-party Lever proxy no longer matches the verified broken public surface',
      )
    }

    const leverBoardPage = await fetchPage(LEVER_BOARD_URL)
    if (!isMissingLeverBoardPage(leverBoardPage)) {
      throw new Error('Ionic Lever board no longer matches the verified missing-board surface')
    }

    return []
  },
})

export const run = async (options = {}) => createIonicScraper().run(options)

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
