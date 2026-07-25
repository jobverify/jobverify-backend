import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { MAVEN_WAVE_PARTNERS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = MAVEN_WAVE_PARTNERS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value = '') => String(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedHomepageRedirectSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Atos')
    && /accelerate intelligence/i.test(normalized)
}

export const hasJobAlertsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Maven Wave Partners Careers')
    && normalized.includes("Get notified about new jobs that match your skills")
    && normalized.includes('Select Job Locations')
    && normalized.includes('Chandigarh')
    && normalized.includes('Gurgaon')
    && normalized.includes('India')
}

const hasTrustworthyCurrentOpenings = (html = '') => /Open Positions|Job listing\s*\||Apply Apply Later/i.test(String(html))

export const createMavenWavePartnersScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasVerifiedHomepageRedirectSignal(homepageHtml)) {
      throw new Error('Maven Wave homepage no longer matches the verified Atos redirect surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasJobAlertsSignal(careersHtml)) {
      throw new Error('Maven Wave public Jobvite surface no longer matches the verified job-alerts shell')
    }

    if (hasTrustworthyCurrentOpenings(careersHtml)) {
      throw new Error('Maven Wave public jobs surface changed materially and needs a verified scraper')
    }

    return []
  },
})

export const run = async (options = {}) => createMavenWavePartnersScraper(options).run(options)

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
