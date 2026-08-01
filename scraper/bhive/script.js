import path from 'node:path'
import { fileURLToPath } from 'node:url'

import PROVIDER_METADATA from './catalog.js'
import { run as runWorkbookBhive } from '../workbookbatch02/bhive.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }

export const run = async (options = {}) => runWorkbookBhive(options)

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
