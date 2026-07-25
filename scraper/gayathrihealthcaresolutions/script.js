import path from 'node:path'
import { resolve4, resolve6 } from 'node:dns/promises'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'gayathrihealthcaresolutions'
export const COMPANY = 'Gayathri Health Care Solutions'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'No trustworthy first-party careers surface was discoverable on July 13, 2026, and the canonical Gayathri Health Care Solutions hostnames did not resolve.'
export const CAREER_HOSTS = [
  'gayathrihealthcaresolutions.com',
  'www.gayathrihealthcaresolutions.com',
  'gayathrihealthcaresolutions.in',
  'www.gayathrihealthcaresolutions.in',
  'gayathrihealthcaresolutions.co.in',
  'www.gayathrihealthcaresolutions.co.in',
  'gayathrihealthcare.com',
  'www.gayathrihealthcare.com',
  'gayathrihealthcare.in',
  'www.gayathrihealthcare.in',
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

export const createGayathriHealthCareSolutionsScraper = () => ({
  async run({
    resolveHosts = resolveCanonicalHosts,
  } = {}) {
    const addresses = await resolveHosts(CAREER_HOSTS)

    if (hasResolvableFirstPartyHost(addresses)) {
      throw new Error(
        'Gayathri Health Care Solutions canonical first-party hosts now resolve; re-verify the official careers surface before trusting []',
      )
    }

    return []
  },
})

export const run = async () => createGayathriHealthCareSolutionsScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
