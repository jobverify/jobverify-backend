import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SRM_TECHNOLOGIES_PVT_LTD_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const CANDIDATE_PORTAL_URL = PROVIDER_METADATA.candidatePortalUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'manual',
  })

  return {
    status: response.status,
    url,
    headers: Object.fromEntries(response.headers.entries()),
    html: await response.text(),
  }
}

export const hasOfficialHomepageCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*SRM Tech\b/i.test(page)
    && text.includes('Careers With Us')
    && text.includes('Open Positions')
    && page.includes(CANDIDATE_PORTAL_URL)
}

export const isLoginGatedCandidatePortal = ({
  status = 0,
  headers = {},
  html = '',
} = {}) => {
  const redirectLocation = String(headers?.location ?? headers?.Location ?? '')
  const text = normalizeWhitespace(html)

  return (
    (status >= 300
      && status < 400
      && /IAMSecurityError\.do\?isload=true/i.test(redirectLocation))
    || (
      text.includes('Candidate Portal')
      && text.includes('Login')
      && text.includes('TOTP')
      && text.includes('Create an account')
    )
  )
}

export const createSrmTechnologiesPvtLtdScraper = () => ({
  async run({
    fetchPage = defaultFetchPage,
  } = {}) {
    const homepage = await fetchPage(CAREERS_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageCareersSignal(homepage.html)) {
      throw new Error('The verified SRM Technologies careers homepage no longer matches the trusted first-party surface')
    }

    const candidatePortal = await fetchPage(CANDIDATE_PORTAL_URL)
    if (!isLoginGatedCandidatePortal(candidatePortal)) {
      throw new Error('SRM Technologies verified candidate portal no longer matches the trusted login gate')
    }

    return []
  },
})

export const run = async (options = {}) => createSrmTechnologiesPvtLtdScraper().run(options)

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
