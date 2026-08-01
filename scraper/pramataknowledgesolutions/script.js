import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'

import PRAMATA_KNOWLEDGE_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = PRAMATA_KNOWLEDGE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const isExpectedCareers403Error = (error, url) =>
  /HTTP 403/i.test(String(error?.message || error || ''))
  && String(url ?? '') === CAREERS_URL

export const hasVerifiedCloudflareChallengeSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Just a moment\.\.\.\s*<\/title>/i.test(page)
    && /Enable JavaScript and cookies to continue/i.test(page)
    && /cZone:\s*'www\.pramata\.com'/i.test(page)
    && /ki-cf-botcl=1/i.test(page)
}

export const exposesStructuredPublicJobs = (html = '') =>
  /\bjob-card\b/i.test(String(html ?? ''))
  || /Solution Architect\s*-\s*Contract AI/i.test(String(html ?? ''))
  || /Current Openings/i.test(String(html ?? ''))

export const hasVerifiedNotFoundNoJobsSignal = (page = {}) => {
  const html = String(page?.html ?? '')
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return Number(page?.status) === 404
    && String(page?.url || '') === CAREERS_URL
    && /<title>\s*Page not found - Pramata\s*<\/title>/i.test(html)
    && /We value your privacy/i.test(text)
    && /Reject All/i.test(text)
    && /Accept All/i.test(text)
    && /Necessary Always Active/i.test(text)
    && !exposesStructuredPublicJobs(html)
}

export const createPramataKnowledgeSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText, fetchBrowserPage = null } = {}) {
    let browserSession = null
    const getBrowserPage = async (url) => {
      if (typeof fetchBrowserPage === 'function') {
        return fetchBrowserPage(url)
      }

      browserSession ??= await createBrowserFetchSession({ userAgent: USER_AGENT })
      return browserSession.fetchPage(url)
    }

    try {
      let careersHtml
      try {
        careersHtml = await fetchText(CAREERS_URL)
      } catch (error) {
        if (!isExpectedCareers403Error(error, CAREERS_URL)) {
          throw error
        }

        const browserPage = await getBrowserPage(CAREERS_URL)
        if (hasVerifiedNotFoundNoJobsSignal(browserPage)) {
          return []
        }

        if (hasVerifiedCloudflareChallengeSignal(browserPage.html)) {
          if (exposesStructuredPublicJobs(browserPage.html)) {
            throw new Error('Pramata Knowledge Solutions careers page now exposes scraper-visible public jobs')
          }
          return []
        }

        throw new Error('The verified Pramata Knowledge Solutions careers surface changed materially')
      }

      if (!hasVerifiedCloudflareChallengeSignal(careersHtml)) {
        throw new Error('The verified Pramata Knowledge Solutions careers surface changed materially')
      }

      if (exposesStructuredPublicJobs(careersHtml)) {
        throw new Error('Pramata Knowledge Solutions careers page now exposes scraper-visible public jobs')
      }

      return []
    } finally {
      await browserSession?.close?.()
    }
  },
})

export const run = async (options = {}) => createPramataKnowledgeSolutionsScraper().run(options)

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
