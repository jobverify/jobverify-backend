import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SOLVERMINDS_SOLUTIONS_AND_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const ABOUT_URL = PROVIDER_METADATA.aboutPageUrl
export const CANDIDATE_PORTAL_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  return /Solverminds/i.test(page) && /The maritime enterprise system/i.test(page)
}

export const hasOfficialAboutSignal = (html = '') => {
  const page = String(html ?? '')
  return /About\s+·\s+Solverminds/i.test(page)
    && /Build the future of maritime/i.test(page)
    && /See open roles/i.test(page)
}

export const hasLoginGatedCandidatePortalSignal = (html = '') => {
  const page = String(html ?? '')
  return /Candidate Portal/i.test(page)
    && /time-based one-time password|TOTP/i.test(page)
    && /Create an account/i.test(page)
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const homepage = await fetchText(HOMEPAGE_URL)
  if (!hasOfficialHomepageSignal(homepage)) {
    throw new Error('Solverminds Solutions and Technologies verified homepage changed materially')
  }

  const aboutPage = await fetchText(ABOUT_URL)
  if (!hasOfficialAboutSignal(aboutPage)) {
    throw new Error('Solverminds Solutions and Technologies verified about page changed materially')
  }

  const candidatePortal = await fetchText(CANDIDATE_PORTAL_URL)
  if (!hasLoginGatedCandidatePortalSignal(candidatePortal)) {
    throw new Error('Solverminds Solutions and Technologies verified login-gated candidate portal changed materially')
  }

  return []
}

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
