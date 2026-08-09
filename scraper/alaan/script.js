import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createVerifiedCareersEmptyStateScraper } from './verifiedCareersEmptyState.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "alaan"
export const COMPANY = "Alaan"
export const CAREERS_URL = "https://www.alaan.com/careers"
export const DISPOSITION = "verified-first-party-careers-empty-result"
export const VERIFIED_ON = "2026-07-30"
export const VERIFIED_SURFACE_SUMMARY = "Verified on Thursday, July 30, 2026 that https://www.alaan.com/careers was the live first-party careers surface for Alaan, that its Open positions section exposed no trustworthy public job listings, and that the page instead invited candidates to email careers@alaanpay.com if no suitable position was listed. The shared verified empty-state scraper returns this authoritative empty result; a future review must replace it with a parser before publishing jobs."

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
