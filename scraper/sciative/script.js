import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SCIATIVE_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SCIATIVE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Dynamic Pricing Software: Achieve the Right Prices with AI')
    && normalized.includes('Take charge of your pricing today with real-time AI pricing optimization.')
    && normalized.includes('info@sciative.com')
  }

export const hasAboutTalentCommunitySignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Humans of Sciative')
    && normalized.includes('Join Our Talent Community')
    && normalized.includes('Awards & Recognition')
  }

export const pageExposesPublicJobListings = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /Apply Now|Senior Full Stack Developer|QA Engineer|Analyst|Engineer|Developer/i.test(normalized)
}

export const createSciativeSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('The official Sciative Solutions homepage no longer matches the verified public surface')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasAboutTalentCommunitySignal(aboutHtml)) {
      throw new Error('The official Sciative Solutions talent community page no longer matches the verified public surface')
    }

    if (pageExposesPublicJobListings(aboutHtml)) {
      throw new Error('The official Sciative Solutions talent community page now exposes public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createSciativeSolutionsScraper().run(options)

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
