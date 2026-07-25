import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { METACUBE_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = METACUBE_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const TRUSTWORTHY_PUBLIC_ROLE_PATTERNS = [
  /<article[^>]*class=["'][^"']*job-card/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\brequisition id\b/i,
  /href=["'][^"']*\/careers\/[^"']+/i,
]

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersShellSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Metacube\s*\|\s*Careers\s*<\/title>/i.test(page)
    && /EXPERIENCED PROFESSIONALS/i.test(page)
    && /STUDENTS\s*&\s*GRADUATES/i.test(page)
    && /Open Positions General Application/i.test(page)
    && /What Makes a Metacubian\?/i.test(page)
}

export const pageExposesTrustworthyPublicRoleCards = (html = '') =>
  TRUSTWORTHY_PUBLIC_ROLE_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createMetacubeSoftwareScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (pageExposesTrustworthyPublicRoleCards(careersHtml)) {
      throw new Error(
        'The verified Metacube Software careers shell surface now appears to expose trustworthy public role cards',
      )
    }

    if (!hasOfficialCareersShellSignal(careersHtml)) {
      throw new Error('The verified Metacube Software careers shell no longer matches the trusted first-party page')
    }

    return []
  },
})

export const run = async (options = {}) => createMetacubeSoftwareScraper().run(options)

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
