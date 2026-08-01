import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { PATHPARTNER_TECHNOLOGY_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 20000,
})

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const isExpectedBlockedFetchError = (error) => /connection was reset|secure channel|tls|ssl|trust relationship/i
  .test(String(error?.message ?? error ?? ''))

export const createPathPartnerTechnologyScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchBrowserText,
  } = {}) {
    try {
      const html = await fetchText(CAREERS_URL)
      if (typeof html === 'string' && html.trim()) {
        throw new Error('PathPartner Technology careers surface became publicly fetchable and needs a fresh manual review')
      }
      throw new Error('PathPartner Technology careers fetch returned an unexpected empty success response')
    } catch (error) {
      if (!isExpectedBlockedFetchError(error)) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        let browserSession = null

        const getBrowserSession = async () => {
          if (!browserSession) {
            browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
          }

          return browserSession
        }

        const browserTextFetcher = fetchBrowserText || (async (url) => {
          const session = await getBrowserSession()
          return session.fetchText(url)
        })

        try {
          const html = await browserTextFetcher(CAREERS_URL)
          if (typeof html === 'string' && html.trim()) {
            throw new Error('PathPartner Technology careers surface became publicly fetchable and needs a fresh manual review')
          }

          throw new Error('PathPartner Technology careers fetch returned an unexpected empty success response')
        } catch (browserError) {
          if (!isExpectedBlockedFetchError(browserError)) {
            throw browserError
          }
        } finally {
          if (browserSession) {
            await browserSession.close()
          }
        }
      }
      return []
    }
  },
})

export const run = async (options = {}) => createPathPartnerTechnologyScraper().run(options)

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
