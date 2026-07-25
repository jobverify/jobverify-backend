import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SLICE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const SLICE_BANK_CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const SLICE_BANK_APPLY_URL = PROVIDER_METADATA.officialBankApplyPageUrl
export const SLICE_ALT_CAREERS_URL = PROVIDER_METADATA.alternateCompanyCareerPage

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => stripTags(value)
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
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
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  } finally {
    clearTimeout(timeout)
  }
}

export const hasVerifiedSliceBankCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Careers \| We go big\. We go beyond \| slice\s*<\/title>/i.test(page)
    && text.includes('Unleash your potential.')
    && text.includes('See all open positions')
    && text.includes('slice small finance bank ltd')
}

export const hasVerifiedSliceBankApplySignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('slice small finance bank ltd')
    && text.includes('Corporate office address: No. 9 Ashford Park View')
    && text.includes('Contact us')
}

export const hasVerifiedAlternateSliceCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Slice Careers - Open for Talent\s*<\/title>/i.test(page)
    && text.includes("THE WORLD'S BEST IDEAS THRIVE HERE")
    && text.includes('Welcome to Slice.')
    && text.includes("Ilir Sela started Slice in 2015 to modernize his friends' and family's New York City pizzerias.")
    && text.includes('about.slicelife.com')
}

export const createSliceScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const bankCareersPage = await fetchPage(SLICE_BANK_CAREERS_URL)

    if (bankCareersPage?.status !== 200 || !hasVerifiedSliceBankCareersSignal(bankCareersPage?.html)) {
      throw new Error('Slice verified slice bank careers page no longer matches the trusted first-party evidence')
    }

    const bankApplyPage = await fetchPage(SLICE_BANK_APPLY_URL)

    if (bankApplyPage?.status !== 200 || !hasVerifiedSliceBankApplySignal(bankApplyPage?.html)) {
      throw new Error('Slice verified slice bank apply page no longer matches the trusted first-party evidence')
    }

    const alternateCareersPage = await fetchPage(SLICE_ALT_CAREERS_URL)

    if (alternateCareersPage?.status !== 200 || !hasVerifiedAlternateSliceCareersSignal(alternateCareersPage?.html)) {
      throw new Error('Slice verified alternate Slice careers page no longer matches the trusted first-party evidence')
    }

    return []
  },
})

export const run = async (options = {}) => createSliceScraper().run(options)

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
