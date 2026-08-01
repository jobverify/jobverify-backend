import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve4, resolve6 } from 'node:dns/promises'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'timeflexdata'
export const COMPANY = 'TimeFlex Data'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'No trustworthy first-party careers surface was discoverable on July 13, 2026, and the canonical company hostnames did not resolve.'
export const CAREER_HOSTS = [
  'timeflexdata.com',
  'www.timeflexdata.com',
  'timeflexdata.in',
  'www.timeflexdata.in',
]

export const hasResolvableFirstPartyHost = (addresses) =>
  Array.isArray(addresses) && addresses.length > 0

export const resolveCanonicalHosts = async (hosts = CAREER_HOSTS) => {
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

export const createTimeFlexDataScraper = () => ({
  async run({
    resolveHosts = resolveCanonicalHosts,
  } = {}) {
    const addresses = await resolveHosts(CAREER_HOSTS)

    if (hasResolvableFirstPartyHost(addresses)) {
      throw new Error(
        'TimeFlex Data canonical first-party hosts now resolve; re-verify the official careers surface before trusting []',
      )
    }

    return []
  },
})

export const run = async () => createTimeFlexDataScraper().run()

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
