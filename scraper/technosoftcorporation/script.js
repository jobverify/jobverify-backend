import path from 'node:path'
import { fileURLToPath } from 'node:url'

import TECHNOSOFT_CORPORATION_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TECHNOSOFT_CORPORATION_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const LEGACY_REDIRECT_URL = PROVIDER_METADATA.legacyRedirectUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const NO_PUBLIC_CAREERS_ROUTE_URLS = [
  'http://www.technosoftcorp.com/careers',
  'http://www.technosoftcorp.com/careers/',
  'http://www.technosoftcorp.com/jobs',
  'http://www.technosoftcorp.com/join-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const hasPublicJobsSignal = (html = '') =>
  /\b(apply now|job openings|current openings|we're hiring|join our team)\b/i.test(String(html ?? ''))

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasTransportFailure = (error) => {
  const code = String(error?.cause?.code ?? error?.code ?? '')
  const message = String(error?.cause?.message ?? error?.message ?? error ?? '')

  return [
    'UND_ERR_CONNECT_TIMEOUT',
    'ENOTFOUND',
    'ENOENT',
    'ECONNABORTED',
  ].includes(code)
    || /\bconnect timeout\b/i.test(message)
    || /\bgetaddrinfo\b/i.test(message)
    || /\bdns\b/i.test(message)
    || /\btimeout\b/i.test(message)
}

export const hasLegacyHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Technosoft is now Apexon\s*<\/title>/i.test(page)
    && text.includes('Technosoft is now Apexon')
    && /href="https:\/\/www\.apexon\.com\/?"/i.test(page)
  }

export const isVerifiedBlockedHomepage = (page = {}) => {
  const html = String(page?.html ?? '')
  const text = normalizeWhitespace(html)

  return Number(page?.status) === 403
    && !hasPublicJobsSignal(html)
    && (/403 Forbidden/i.test(html) || text === '403 Forbidden nginx')
}

export const isVerifiedMissingCareerRoute = (page = {}) =>
  [403, 404].includes(Number(page?.status))
  && !hasPublicJobsSignal(page?.html ?? '')
  && /^(|403 Forbidden|403 Forbidden nginx)$/i.test(normalizeWhitespace(page?.html ?? ''))

export const createTechnosoftCorporationScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    try {
      const homepage = await fetchPage(HOMEPAGE_URL)
      if (isVerifiedBlockedHomepage(homepage)) {
        return []
      }

      if (homepage.status !== 200 || !hasLegacyHomepageSignal(homepage.html)) {
        throw new Error('The verified Technosoft Corporation exact-name surface changed materially')
      }

      for (const routeUrl of NO_PUBLIC_CAREERS_ROUTE_URLS) {
        const routePage = await fetchPage(routeUrl)
        if (!isVerifiedMissingCareerRoute(routePage)) {
          throw new Error('The verified Technosoft Corporation exact-name surface changed materially')
        }
      }

      return []
    } catch (error) {
      if (hasTransportFailure(error)) {
        return []
      }

      throw error
    }
  },
})

export const run = async (options = {}) => createTechnosoftCorporationScraper().run(options)

const isDirectExecution = (() => {
  if (!process.argv[1]) return false

  try {
    return path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  } catch {
    return false
  }
})()

if (isDirectExecution) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
