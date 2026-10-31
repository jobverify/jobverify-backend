import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runNativeAplazo, CAREERS_URL as NATIVE_CAREERS_URL } from './nativeCollector.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "aplazo"
export const COMPANY = "Aplazo"
export const CAREERS_URL = NATIVE_CAREERS_URL
export const DISPOSITION = "native-ashby-current-employer-handoff-partial-scope"
export const VERIFIED_ON = null
export const VERIFIED_SURFACE_SUMMARY = "Reads the active employer Aplazo careers handoff and exact Ashby tenant, preserving native role identity and full descriptions. Whole-company and India totals remain unproved."

export const run = async (options = {}) => runNativeAplazo(options)

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
