import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runNativeBanyan } from './nativeRun.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "banyansoftware"
export const COMPANY = "Banyan Software"
export const CAREERS_URL = 'https://banyansoftware.com/careers'
export const DISPOSITION = 'current-official-greenhouse-inventory'
export const VERIFIED_ON = null
export const VERIFIED_SURFACE_SUMMARY = 'Each run verifies the current active first-party Greenhouse iframe, reconciles the complete native listing twice, and checks primary and secondary office country evidence. Current inventory is runtime evidence; company-wide totals are not inferred from historical notes.'

export const run = options => runNativeBanyan(options)

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
