import path from 'node:path'
import { fileURLToPath } from 'node:url'

import PROVIDER_METADATA from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }

// Preserve the current verified-empty behavior behind a dedicated local scraper module.
export const run = async () => []

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, PROVIDER_METADATA.source)
  }
}
