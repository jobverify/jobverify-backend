import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SOSTRONK_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SOSTRONK_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const COMPANY_DOMAIN = PROVIDER_METADATA.companyDomain
export const CHANGELOG_URL = PROVIDER_METADATA.changelogUrl
export const VERIFIED_AT = PROVIDER_METADATA.verifiedOn
export const FIRST_PARTY_TIMEOUT_URLS = PROVIDER_METADATA.firstPartyTimeoutUrls

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const hasPublicJobsSignal = (html = '') => /current openings|apply now|careers|jobs/i.test(normalizeWhitespace(html))

export const hasOfficialChangelogSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('SoStronk release notes')
    && normalized.includes('Karan, Co-Founder & CTO')
    && normalized.includes('www.sostronk.com')
}

export const isExpectedTimedOutSurface = ({ errorKind, status } = {}) =>
  errorKind === 'timeout' && status == null

export const isUnexpectedReachableSurface = ({ status, html } = {}) =>
  Number(status) >= 200 && Number(status) < 400 && normalizeWhitespace(html).length >= 0

const defaultProbeUrl = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(12000),
    })

    return {
      url,
      finalUrl: response.url,
      status: response.status,
      html: await response.text(),
      errorKind: null,
    }
  } catch (error) {
    const message = String(error?.message ?? '')
    const errorKind = /timed out|timeout|abort/i.test(message)
      ? 'timeout'
      : /enotfound|could not resolve host/i.test(message)
        ? 'dns'
        : /certificate|ssl|tls/i.test(message)
          ? 'tls'
          : 'network'

    return {
      url,
      finalUrl: url,
      status: null,
      html: null,
      errorKind,
      message,
    }
  }
}

export const createSostronkScraper = () => ({
  async run({ probeUrl = defaultProbeUrl } = {}) {
    for (const url of FIRST_PARTY_TIMEOUT_URLS) {
      const result = await probeUrl(url)

      if (isExpectedTimedOutSurface(result)) continue

      if (isUnexpectedReachableSurface(result)) {
        if (url.includes('/careers') || url.includes('/jobs') || hasPublicJobsSignal(result.html)) {
          throw new Error('Sostronk public jobs surface appeared on a previously timed-out route')
        }

        throw new Error('Sostronk official first-party route changed materially and must be re-verified')
      }

      throw new Error('Sostronk verified timed-out surface changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createSostronkScraper().run(options)

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
