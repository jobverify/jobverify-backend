import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

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

export const createPramataKnowledgeSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasVerifiedCloudflareChallengeSignal(careersHtml)) {
      throw new Error('The verified Pramata Knowledge Solutions careers surface changed materially')
    }

    if (exposesStructuredPublicJobs(careersHtml)) {
      throw new Error('Pramata Knowledge Solutions careers page now exposes scraper-visible public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createPramataKnowledgeSolutionsScraper().run(options)

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
