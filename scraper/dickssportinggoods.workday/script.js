import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createFailClosedSentinelScraper } from './failClosedSentinel.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "dickssportinggoods"
export const COMPANY = "Dick's Sporting Goods"
export const CAREERS_URL = null
export const DISPOSITION = "workbook-exact-name-sentinel"
export const VERIFIED_ON = "2026-08-01"
export const VERIFIED_SURFACE_SUMMARY = "Workbook batch 09 exact-name sentinel for Dick's Sporting Goods added on Saturday, August 1, 2026. It intentionally returns zero jobs until a trustworthy public careers surface is verified for this exact company name."

export const run = async () => createFailClosedSentinelScraper().run()

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
