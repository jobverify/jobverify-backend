import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { BGD_TECH_PVT_LTD_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = BGD_TECH_PVT_LTD_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const pageExposesPublicJobListings = (html = '') => (
  /\bcurrent openings\b/i.test(String(html ?? ''))
  || /\bapply now\b/i.test(String(html ?? ''))
  || /\/jobs\//i.test(String(html ?? ''))
)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)
  return /<title>\s*Careers at BGD\s*<\/title>/i.test(page)
    && normalized.includes('Welcome to the vacancies page of our company!')
    && normalized.includes("Didn't find the right job?")
    && normalized.includes('hello@bgd-limited.com')
  }

export const createBGDTechPvtLtdScraper = ({ fetchPage = defaultFetchPage } = {}) => ({
  async run({ fetchPage: overrideFetchPage } = {}) {
    const page = await (overrideFetchPage || fetchPage)(CAREERS_URL)

    if (pageExposesPublicJobListings(page.html)) {
      throw new Error('The verified BGD Tech PVT LTD careers page now appears to expose a public jobs surface')
    }

    if (Number(page.status) !== 200 || !hasOfficialCareersSignal(page.html)) {
      throw new Error('The verified BGD Tech PVT LTD careers page no longer matches the pinned intake surface')
    }

    return []
  },
})

export const run = async (options = {}) => createBGDTechPvtLtdScraper().run(options)

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
