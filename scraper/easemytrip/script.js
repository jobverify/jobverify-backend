import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { saveToDB, saveToFile } from '../../scraper-support/utils/saveToDB.js'

export const SOURCE = 'easemytrip'
export const COMPANY = 'EaseMyTrip'
export const CAREERS_URL = 'https://www.easemytrip.com/'

// EaseMyTrip has no trusted, enumerable first-party India jobs surface yet.
export const run = async () => []

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(path.dirname(fileURLToPath(import.meta.url)), 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
