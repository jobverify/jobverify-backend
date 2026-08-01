import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEUTSCHE_TELEKOM_DIGITAL_LABS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DEUTSCHE_TELEKOM_DIGITAL_LABS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const TELEKOM_WORLDWIDE_URL = PROVIDER_METADATA.telekomWorldwidePageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CHECKED_ROUTE_URLS = [
  'https://dtdl.in/careers',
  'https://dtdl.in/jobs',
  'https://dtdl.in/join-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const hasTelekomAffiliateSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  return normalized.includes('DT Digital Labs in India is responsible for product development.')
    && page.includes('https://dtdl.in/')
}

export const hasExactNameHomepageShellSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('DTDL')
    && normalized.includes('You need to enable JavaScript to run this app.')
    && normalized.includes('Loading ...')
  }

const PUBLIC_JOB_PATTERNS = [/\bcurrent openings\b/i, /\bapply now\b/i, /\/jobs\//i]

export const hasPublicJobSignals = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

const isAllowedCheckedRouteState = (page) =>
  Number(page?.status) === 404
  || (Number(page?.status) === 200 && hasExactNameHomepageShellSignal(page?.html) && !hasPublicJobSignals(page?.html))

export const createDeutscheTelekomDigitalLabsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const affiliatePage = await fetchPage(TELEKOM_WORLDWIDE_URL)
    if (Number(affiliatePage.status) !== 200 || !hasTelekomAffiliateSignal(affiliatePage.html)) {
      throw new Error('The verified Telekom affiliate surface no longer confirms the DTDL exact-name host')
    }

    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      Number(homepage.status) !== 200
      || !hasExactNameHomepageShellSignal(homepage.html)
      || hasPublicJobSignals(homepage.html)
    ) {
      throw new Error('The DTDL exact-name homepage shell changed materially or now exposes public jobs')
    }

    for (const url of CHECKED_ROUTE_URLS) {
      const page = await fetchPage(url)
      if (!isAllowedCheckedRouteState(page) || hasPublicJobSignals(page.html)) {
        throw new Error('A checked DTDL career route changed materially or now exposes public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createDeutscheTelekomDigitalLabsScraper().run(options)

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
