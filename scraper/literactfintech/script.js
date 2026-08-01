import path from 'node:path'
import { resolve4, resolve6 } from 'node:dns/promises'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'literactfintech'
export const COMPANY = 'Literact Fintech'
export const VERIFIED_ON = '2026-07-13'
export const VERIFIED_SURFACE_SUMMARY =
  'No trustworthy first-party careers surface was discoverable on July 13, 2026: the canonical literactfintech hostnames were unresolved, and literact.com redirected to a parked Sparkname for-sale page.'
export const CANONICAL_HOSTS = [
  'literactfintech.com',
  'www.literactfintech.com',
  'literactfintech.in',
  'www.literactfintech.in',
]
export const PARKED_DOMAIN_URL = 'https://literact.com/'
export const PARKED_FINAL_URL = 'https://www.sparkname.com/name/Literact.com'

const SPARKNAME_PATTERN = /\bsparkname\b/i
const FOR_SALE_TITLE_PATTERN = /<title>\s*literact\.com is for sale\s*<\/title>/i
const PUBLIC_JOB_SIGNAL_PATTERN =
  /\b(careers|career opportunities|open roles|open positions|job openings|vacancies|apply now|join our team)\b|boards\.greenhouse\.io|jobs\.lever\.co|ashbyhq\.com|workdayjobs|smartrecruiters/i

export const hasResolvableFirstPartyHost = (addresses) =>
  Array.isArray(addresses) && addresses.length > 0

export const isVerifiedParkedPage = ({ finalUrl, html }) => {
  const page = String(html ?? '')

  return String(finalUrl ?? '') === PARKED_FINAL_URL
    && SPARKNAME_PATTERN.test(page)
    && FOR_SALE_TITLE_PATTERN.test(page)
}

export const hasPublicJobSignal = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERN.test(String(html ?? ''))

export const resolveCanonicalHosts = async (hosts = CANONICAL_HOSTS) => {
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

export const fetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; JobifyCareerScraper/1.0)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    finalUrl: response.url,
    html: await response.text(),
  }
}

export const createLiteractFintechScraper = () => ({
  async run({
    resolveHosts = resolveCanonicalHosts,
    fetchPage: fetchPageImpl = fetchPage,
  } = {}) {
    const addresses = await resolveHosts(CANONICAL_HOSTS)

    if (hasResolvableFirstPartyHost(addresses)) {
      throw new Error(
        'Literact Fintech canonical literactfintech hosts now resolve; re-verify the official careers surface before trusting []',
      )
    }

    const parkedPage = await fetchPageImpl(PARKED_DOMAIN_URL)

    if (hasPublicJobSignal(parkedPage.html)) {
      throw new Error('Literact Fintech parked domain now appears to expose public jobs')
    }

    if (!isVerifiedParkedPage(parkedPage)) {
      throw new Error('Literact Fintech parked domain surface changed from the verified Sparkname for-sale page')
    }

    return []
  },
})

export const run = async (options = {}) => createLiteractFintechScraper().run(options)

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
