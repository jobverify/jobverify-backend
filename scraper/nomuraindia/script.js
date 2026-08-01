import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createVerifiedCareersEmptyStateScraper } from './verifiedCareersEmptyState.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "nomuraindia"
export const COMPANY = "Nomura India"
export const CAREERS_URL = "https://careers.nomura.com/Nomura/go/Career-Opportunities-India/9050900/"
export const DISPOSITION = "verified-first-party-careers-empty-result"
export const VERIFIED_ON = "2026-07-25"
export const VERIFIED_SURFACE_SUMMARY = "Verified on Saturday, July 25, 2026 that https://careers.nomura.com/Nomura/go/Career-Opportunities-India/9050900/ was the live first-party careers surface for Nomura India and exposed zero trustworthy public jobs. The dedicated batch-04 snapshot scraper returns this authoritative empty result; a future review must replace it with a parser before publishing jobs."

export const run = async () => createVerifiedCareersEmptyStateScraper().run()

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
