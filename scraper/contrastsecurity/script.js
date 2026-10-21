import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {runNative} from './nativeRun.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = "contrastsecurity"
export const COMPANY = "Contrast Security"
export const CAREERS_URL = 'https://www.contrastsecurity.com/contrast-careers'
export const DISPOSITION = 'current-native-empty-board-company-scope-unproven'
export const VERIFIED_ON = '2026-10-21'
export const VERIFIED_SURFACE_SUMMARY = 'Current official-bound Ashby board and API are checked each run; an empty subboard never certifies company-wide zero, and new native roles require full qualification.'

export const run = runNative

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
