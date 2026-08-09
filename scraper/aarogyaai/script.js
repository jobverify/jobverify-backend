import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'aarogyaai'
export const COMPANY = 'AarogyaAI'
export const COMPANY_DOMAIN = 'aarogyaai.com'
export const VERIFIED_AT = '2026-07-14'
export const FIRST_PARTY_ROOT_URLS = [
  'https://aarogyaai.com/',
  'https://aarogyaai.in/',
]
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://aarogyaai.com/careers',
  'https://aarogyaai.com/jobs',
  'https://aarogyaai.in/careers',
  'https://aarogyaai.in/jobs',
]
export const SCRAPER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: FIRST_PARTY_ROOT_URLS[0],
  companyDomain: COMPANY_DOMAIN,
  countryFilter: 'India',
  atsPlatform: 'official-company-site-no-public-careers',
  paginationStrategy: 'exact-name-domain-root-plus-common-careers-route-timeout-validation',
  extractionStrategy:
    'verified-exact-name-first-party-domains-time-out-plus-common-careers-routes-time-out-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 10000

export const isExpectedUnreachableSurface = (surface = {}) =>
  surface?.errorKind === 'timeout'
  && !Number.isInteger(surface?.status)
  && surface?.html == null

export const isUnexpectedReachableSurface = (surface = {}) =>
  Number.isInteger(surface?.status) && surface.status > 0

const defaultProbeUrl = async (url) => {
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
      url,
      finalUrl: response.url,
      status: response.status,
      html: await response.text(),
      errorKind: null,
    }
  } catch (error) {
    clearTimeout(timeout)

    if (error?.name === 'AbortError') {
      return {
        url,
        finalUrl: url,
        status: null,
        html: null,
        errorKind: 'timeout',
      }
    }

    const cause = String(error?.cause ?? error?.message ?? error)
    if (/ENOTFOUND|getaddrinfo/i.test(cause)) {
      return {
        url,
        finalUrl: url,
        status: null,
        html: null,
        errorKind: 'dns',
      }
    }

    return {
      url,
      finalUrl: url,
      status: null,
      html: null,
      errorKind: 'network',
      errorMessage: String(error?.message ?? error),
    }
  }
}

const assertVerifiedUnreachableSurface = (surface, label) => {
  if (isExpectedUnreachableSurface(surface)) return

  if (isUnexpectedReachableSurface(surface)) {
    throw new Error(`AarogyaAI ${label} now appears reachable or exposes a public jobs surface: ${surface.finalUrl || surface.url}`)
  }

  throw new Error(`AarogyaAI verified unreachable surface changed materially: ${surface.url}`)
}

export const createAarogyaAIScraper = () => ({
  async run({ probeUrl = defaultProbeUrl } = {}) {
    const rootSurfaces = await Promise.all(FIRST_PARTY_ROOT_URLS.map((url) => probeUrl(url)))
    rootSurfaces.forEach((surface) => assertVerifiedUnreachableSurface(surface, 'official first-party root'))

    const routeSurfaces = await Promise.all(NO_PUBLIC_JOB_ROUTE_URLS.map((url) => probeUrl(url)))
    routeSurfaces.forEach((surface) => assertVerifiedUnreachableSurface(surface, 'public jobs surface'))

    return []
  },
})

export const run = async (options = {}) => createAarogyaAIScraper().run(options)

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
