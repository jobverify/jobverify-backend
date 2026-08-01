import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { QUBOLE_INDIA_CATALOG as PROVIDER_METADATA } from './catalog.js'

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

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bapply now\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /darwinbox/i,
  /peoplestrong/i,
  /ashbyhq\.com/i,
  /oraclecloud\.com\/hcmUI\/CandidateExperience/i,
  /oraclecloud\.com\/hcmRestApi\/resources\/latest\/recruitingCEJobRequisitions/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim()

const stripTagsToText = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const normalizeUrlForComparison = (value) => {
  try {
    const url = new URL(String(value ?? ''))
    url.hash = ''

    let normalized = url.toString()
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1)
    }

    return normalized
  } catch {
    return null
  }
}

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

export const extractOpenPositionsUrl = (html = '') => {
  const match = String(html ?? '').match(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>\s*View Open Positions\s*<\/a>/i,
  )

  return match?.[1] ?? null
}

export const pageExposesPublicJobListings = (html = '') => {
  const page = String(html ?? '')
  if (PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(page))) {
    const openPositionsUrl = extractOpenPositionsUrl(page)
    if (!openPositionsUrl) return true

    return normalizeUrlForComparison(openPositionsUrl) !== normalizeUrlForComparison(CAREERS_URL)
  }

  const openPositionsUrl = extractOpenPositionsUrl(page)
  if (!openPositionsUrl) return false

  return normalizeUrlForComparison(openPositionsUrl) !== normalizeUrlForComparison(CAREERS_URL)
}

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTagsToText(page)
  const openPositionsUrl = extractOpenPositionsUrl(page)

  return /<title>\s*Careers\s*\|\s*Open Job Opportunities at Qubole\s*<\/title>/i.test(page)
    && /Careers:\s*Check out our open career opportunities\./i.test(page)
    && /We are always hiring opportunistically for the best engineers at all of our locations\./i.test(page)
    && text.includes('View Open Positions')
    && normalizeUrlForComparison(openPositionsUrl) === normalizeUrlForComparison(CAREERS_URL)
}

export const createQuboleIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (
      careersPage.status !== 200
      || normalizeUrlForComparison(careersPage.url) !== normalizeUrlForComparison(CAREERS_URL)
    ) {
      throw new Error('Qubole India verified official careers page no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(careersPage.html)) {
      throw new Error('Qubole India careers page now appears to expose public jobs')
    }

    if (!hasOfficialCareersPageSignal(careersPage.html)) {
      throw new Error('Qubole India verified official careers page no longer matches the known public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createQuboleIndiaScraper().run(options)

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
