import path from 'path'
import { fileURLToPath } from 'url'
import { resolve4, resolve6 } from 'node:dns/promises'

import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREER_PAGE_URL = 'https://engineerminds.com/'
export const CAREER_HOSTS = [
  'engineerminds.com',
  'www.engineerminds.com',
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'engineerminds',
  timeoutMs: 15000,
})

export const hasPublicCareerHost = (addresses) => Array.isArray(addresses) && addresses.length > 0

export const extractOpenings = () => []

export const resolveCareerHosts = async (hosts = CAREER_HOSTS) => {
  const addresses = new Set()

  for (const host of hosts) {
    try {
      for (const address of await resolve4(host)) {
        addresses.add(address)
      }
    } catch {}

    try {
      for (const address of await resolve6(host)) {
        addresses.add(address)
      }
    } catch {}
  }

  return [...addresses]
}

export const createEngineermindsScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    resolveAddresses = resolveCareerHosts,
    fetchText = defaultFetchText,
  } = {}) {
    const addresses = await resolveAddresses()

    if (!hasPublicCareerHost(addresses)) {
      return []
    }

    const html = await fetchText(CAREER_PAGE_URL)
    const jobs = extractOpenings(html)

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async () => createEngineermindsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  console.log(`Running Engineerminds scraper standalone (${isDryRun ? 'dry-run' : 'live'})...`)
  const jobs = await run()
  console.log(`\nTotal India jobs scraped: ${jobs.length}`)

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
    console.log(`Dry run - wrote ${jobs.length} jobs to jobs.json`)
  } else {
    const result = await saveToDB(jobs, 'engineerminds')
    console.log('DB result:', result)
    process.exit(0)
  }
}
