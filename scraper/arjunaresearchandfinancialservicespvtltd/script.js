import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resolve4, resolve6 } from 'node:dns/promises'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'arjunaresearchandfinancialservicespvtltd'
export const COMPANY = 'Arjuna Research and Financial Services Pvt Ltd'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'No trustworthy first-party careers surface was discoverable on July 13, 2026, and the canonical company hostnames did not resolve.'
export const DNS_LOOKUP_TIMEOUT_MS = 5000
export const CAREER_HOSTS = [
  'arjunaresearch.com',
  'www.arjunaresearch.com',
  'arjunaresearch.in',
  'www.arjunaresearch.in',
  'arjunaresearchandfinancialservices.com',
  'www.arjunaresearchandfinancialservices.com',
  'arjunaresearchandfinancialservices.in',
  'www.arjunaresearchandfinancialservices.in',
]

export const hasResolvableFirstPartyHost = (addresses) =>
  Array.isArray(addresses) && addresses.length > 0

const raceWithTimeout = (promise, timeoutMs) => Promise.race([
  promise,
  new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`DNS lookup timed out after ${timeoutMs}ms`)), timeoutMs)
  }),
])

export const resolveCanonicalHosts = async (
  hosts = CAREER_HOSTS,
  {
    resolveIpv4 = resolve4,
    resolveIpv6 = resolve6,
    lookupTimeoutMs = DNS_LOOKUP_TIMEOUT_MS,
  } = {},
) => {
  const addresses = new Set()
  const lookups = hosts.flatMap((host) => ([
    raceWithTimeout(resolveIpv4(host), lookupTimeoutMs),
    raceWithTimeout(resolveIpv6(host), lookupTimeoutMs),
  ]))

  for (const lookup of lookups) {
    try {
      for (const address of await lookup) {
        addresses.add(address)
      }
    } catch {}
  }

  return [...addresses]
}

export const createArjunaResearchAndFinancialServicesScraper = () => ({
  async run({
    resolveHosts = resolveCanonicalHosts,
    lookupTimeoutMs = DNS_LOOKUP_TIMEOUT_MS,
  } = {}) {
    const addresses = await resolveHosts(CAREER_HOSTS, { lookupTimeoutMs })

    if (hasResolvableFirstPartyHost(addresses)) {
      throw new Error(
        'Arjuna Research and Financial Services Pvt Ltd canonical first-party hosts now resolve; re-verify the official careers surface before trusting []',
      )
    }

    return []
  },
})

export const run = async () => createArjunaResearchAndFinancialServicesScraper().run()

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
