import path from 'node:path'
import { fileURLToPath } from 'node:url'

import MFINE_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = MFINE_CATALOG
export const SOURCE = MFINE_CATALOG.source
export const COMPANY = MFINE_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = MFINE_CATALOG.officialBrandName
export const VERIFIED_ON = MFINE_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = MFINE_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = MFINE_CATALOG.homepageUrl
export const CONTACT_PAGE_URL = MFINE_CATALOG.companyCareerPage
export const OFFICIAL_CAREERS_HANDOFF_URL = MFINE_CATALOG.officialCareersHandoffUrl
export const DARWINBOX_CAREERS_URL = MFINE_CATALOG.darwinboxCareersUrl
export const DARWINBOX_SHELL_ROUTE_URLS = MFINE_CATALOG.darwinboxShellRouteUrls
export const DARWINBOX_LISTING_API_URL = MFINE_CATALOG.darwinboxListingApiUrl

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u2019/g, "'")
  .replace(/\u00a0/g, ' ')
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

const defaultProbeListingApi = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    body: await response.text(),
  }
}

export const extractOfficialCareersHandoffUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/www\.mfine\.co\/join-us\/?/i)
  return match?.[0]?.endsWith('/') ? match[0] : `${match?.[0] ?? ''}${match ? '/' : ''}` || null
}

export const hasOfficialMfineCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page).toLowerCase()

  return (
    text.includes('careers at mfine')
    && text.includes('career with mfine')
    && extractOfficialCareersHandoffUrl(page) === OFFICIAL_CAREERS_HANDOFF_URL
  )
}

export const hasBlankDarwinboxShellSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return (
    (
      text === '-'
      && /<meta\s+property=["']og:title["']\s+content=["']\s*["']/i.test(page)
      && !/current openings|apply now|jobdetails|careers\/job/i.test(page)
    )
    || (
      /<base\s+href=["']\/ms\/candidate\/["']\s*\/?>/i.test(page)
      && /please enable javascript!/i.test(text)
      && /candidateweb\/assets\/bot\.js/i.test(page)
    )
    || (
      /<base\s+href=["']\/ms\/candidatev2\/["']\s*\/?>/i.test(page)
      && /<app-root\b/i.test(page)
      && /candidateweb\/assets\/bot\.js/i.test(page)
      && /pendo/i.test(page)
    )
  )
}

export const hasDarwinboxTenantInfoError = ({ status, body } = {}) => {
  const text = normalizeWhitespace(body).toLowerCase()
  return status >= 500 && text.includes('internal server error') && text.includes('tenant info')
}

export const createMfineScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
    probeListingApi = defaultProbeListingApi,
  } = {}) {
    const contactPage = await fetchPage(CONTACT_PAGE_URL)

    if (Number(contactPage?.status) !== 200 || !hasOfficialMfineCareersSignal(contactPage?.html)) {
      throw new Error('The verified Mfine contact page no longer matches the verified careers handoff surface')
    }

    const handoffPage = await fetchPage(OFFICIAL_CAREERS_HANDOFF_URL)
    if (handoffPage?.url !== DARWINBOX_CAREERS_URL || !hasBlankDarwinboxShellSignal(handoffPage?.html)) {
      throw new Error('The Mfine Darwinbox handoff no longer lands on the verified blank public shell')
    }

    for (const url of DARWINBOX_SHELL_ROUTE_URLS) {
      const page = await fetchPage(url)
      if (Number(page?.status) !== 200 || !hasBlankDarwinboxShellSignal(page?.html)) {
        throw new Error(`The verified Mfine Darwinbox shell route changed: ${url}`)
      }
    }

    const apiResult = await probeListingApi(DARWINBOX_LISTING_API_URL)
    if (hasDarwinboxTenantInfoError(apiResult)) {
      return []
    }

    throw new Error('The verified Mfine Darwinbox listing API error state changed')
  },
})

export const run = async () => createMfineScraper().run()

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
