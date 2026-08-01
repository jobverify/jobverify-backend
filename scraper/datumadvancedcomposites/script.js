import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve4, resolve6 } from 'node:dns/promises'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'datumadvancedcomposites'
export const COMPANY = 'Datum Advanced Composites'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'No trustworthy public first-party careers surface was discoverable on July 13, 2026, and the verified canonical company hostnames did not resolve.'
export const CAREER_HOSTS = [
  'datumadvancedcomposites.com',
  'www.datumadvancedcomposites.com',
  'datumadvancedcomposites.in',
  'www.datumadvancedcomposites.in',
  'datumadvancedcomposites.co.in',
  'www.datumadvancedcomposites.co.in',
  'datumcomposites.com',
  'www.datumcomposites.com',
  'datumcomposites.in',
  'www.datumcomposites.in',
]

export const hasResolvableFirstPartyHost = (addresses) =>
  Array.isArray(addresses) && addresses.length > 0

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

export const createDatumAdvancedCompositesScraper = () => ({
  async run({
    resolveHosts = resolveCareerHosts,
  } = {}) {
    const addresses = await resolveHosts(CAREER_HOSTS)

    if (hasResolvableFirstPartyHost(addresses)) {
      throw new Error(
        'Datum Advanced Composites canonical first-party hosts now resolve; re-verify the official careers surface before trusting []',
      )
    }

    return []
  },
})

export const run = async () => createDatumAdvancedCompositesScraper().run()

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
