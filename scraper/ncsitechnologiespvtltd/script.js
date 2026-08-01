import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { NCSI_TECHNOLOGIES_PVT_LTD_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = NCSI_TECHNOLOGIES_PVT_LTD_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasVerifiedCareersPageSignal = (html = '') => {
  const rawHtml = String(html ?? '')
  return /NCSi Careers/i.test(rawHtml)
    && /YOUR CAREER\. OUR COMMITMENT\./i.test(rawHtml)
    && /Join our renowned team/i.test(rawHtml)
  }

export const createNcsitechnologiespvtltdScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedCareersPageSignal(careersHtml)) {
      throw new Error('NCSI verified generic careers landing no longer matches the known fail-closed contract')
    }

    return []
  },
})

export const run = async (options = {}) => createNcsitechnologiespvtltdScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
