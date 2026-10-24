import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createPublishingGapAtsScraper } from '../../scraper-support/utils/publishingGapAts.js'
import { verifyOfficialAtsBinding } from '../../scraper-support/utils/officialAtsBinding.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "gocardless"
export const COMPANY = "GoCardless"
export const CAREERS_URL = 'https://gocardless.com/about/careers'
export const BOARD_URL = 'https://job-boards.greenhouse.io/gocardless'

export const run = async ({ fetchPage, fetchJson, signal } = {}) => {
  await verifyOfficialAtsBinding({ source: SOURCE, officialUrl: CAREERS_URL, boardUrl: BOARD_URL }, { fetchPage, signal })
  return createPublishingGapAtsScraper({ source: SOURCE, companyName: COMPANY, atsPlatform: 'greenhouse', boardToken: 'gocardless' }).run({ fetchJson, signal })
}

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
