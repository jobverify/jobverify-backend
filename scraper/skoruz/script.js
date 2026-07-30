import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SKORUZ_CATALOG from './catalog.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = SKORUZ_CATALOG.source
export const COMPANY = SKORUZ_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SKORUZ_CATALOG.officialBrandName
export const VERIFIED_ON = SKORUZ_CATALOG.verifiedOn
export const PROVIDER_METADATA = SKORUZ_CATALOG
export const CAREERS_URL = SKORUZ_CATALOG.companyCareerPage
export const INDIA_IFRAME_URL = SKORUZ_CATALOG.embeddedIndiaJobsUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()

export const extractIndiaIframeUrl = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<iframe[^>]+src=["']([^"']+)["']/i)?.[1] ?? null)
    || null

export const hasVerifiedCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  const iframeUrl = extractIndiaIframeUrl(html)

  return normalized.includes('careers | skoruz technologies pvt ltd')
    && normalized.includes('join us')
    && normalized.includes('multiple open positions')
    && normalized.includes('india')
    && normalized.includes('united states')
    && normalized.includes('currently, no openings available. please check back later for updates. thank you for your interest!')
    && iframeUrl === INDIA_IFRAME_URL
}

export const isTrustedIndiaIframeFailure = (error) => {
  const message = normalizeWhitespace(error?.message ?? error).toLowerCase()

  return message.includes('trust relationship')
    || message.includes('ssl/tls')
    || message.includes('secure channel')
    || message.includes('could not connect')
    || message.includes('connect timeout error')
    || message.includes('timeout:')
    || message.includes('timeout error')
    || message.includes('timed out')
    || message.includes('certificate')
}

export const createSkoruzScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersSignal(careersHtml)) {
      throw new Error('Response is not the verified Skoruz careers page')
    }

    const iframeUrl = extractIndiaIframeUrl(careersHtml)
    if (!iframeUrl) {
      throw new Error('The verified Skoruz careers page no longer exposes the India iframe URL')
    }

    try {
      await fetchText(iframeUrl)
    } catch (error) {
      if (isTrustedIndiaIframeFailure(error)) {
        return []
      }

      throw error
    }

    throw new Error('Skoruz India jobs iframe became reachable or changed materially')
  },
})

export const run = async (options = {}) => createSkoruzScraper().run(options)

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
