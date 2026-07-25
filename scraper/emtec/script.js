import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { EMTEC_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = EMTEC_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = String(html).replace(/\s+/g, ' ')

  return normalized.includes('Careers - Engineering, Marketing, & Technology - Bridgenext')
    && normalized.includes('Careers')
    && normalized.includes('Dream Bigger. Join our Bridgenext team!')
    && normalized.includes('India Openings')
    && normalized.includes('Copyright © 2026 Bridgenext. All rights reserved.')
}

export const hasExternalIcimsHandoff = (html = '') =>
  /careers-bridgenext\.icims\.com/i.test(String(html))

export const hasFirstPartyInventorySignal = (html = '') =>
  /Salesforce Technical Architect|MDM Profisee|itemtype=["']https:\/\/schema\.org\/JobPosting|Pune, India/i.test(
    String(html),
  )

export const createEmtecScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)
    if (
      !hasOfficialCareersSignal(html)
      || !hasExternalIcimsHandoff(html)
      || hasFirstPartyInventorySignal(html)
    ) {
      throw new Error('The verified Emtec/Bridgenext recruiting surface no longer matches the trusted external-handoff sentinel')
    }

    return []
  },
})

export const run = async (options = {}) => createEmtecScraper().run(options)

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
