import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'purplle'
export const COMPANY = 'Purplle'
export const CAREERS_URL = 'https://www.purplle.com/careers'

// Do not substitute third-party listings until Purplle exposes an enumerable official feed.
export const createPurplleScraper = () => ({
  async run() {
    return []
  },
})

export const run = async () => createPurplleScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
