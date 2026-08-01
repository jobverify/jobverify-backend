import path from 'path'
import { fileURLToPath } from 'url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAREERS_URL = 'https://enerparc.in/apply-now/'

const SOURCE = 'enerparcenergy'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /Enerparc Energy Pvt\.? Ltd\.?/i.test(page)
    && /Careers/i.test(page)
    && /enerparc\.zohorecruit\.in\/jobs\/Careers/i.test(page)
}

export const hasNoPublicListingsSignal = (html) => {
  const page = String(html ?? '')

  return hasOfficialCareersSignal(page)
    && !/\b(current openings|open positions|job openings|vacancies)\b/i.test(page)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createEnerparcEnergyScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Enerparc Energy careers page no longer matches the verified official careers surface')
    }

    if (!hasNoPublicListingsSignal(careersHtml)) {
      throw new Error('Enerparc Energy careers page no longer matches the verified official no-public-listings surface')
    }

    return []
  },
})

export const run = async (options = {}) => createEnerparcEnergyScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Enerparc Energy scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, SOURCE)
    console.log('DB result:', result)
    process.exit(0)
  }
}
