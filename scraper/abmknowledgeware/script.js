import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'abmknowledgeware'
export const COMPANY = 'ABM Knowledgeware'
export const COMPANY_DOMAIN = 'abmindia.com'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://www.abmindia.com/'
export const CAREERS_URL = 'https://abmindia.com/home/abm_career'
export const SCRAPER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: CAREERS_URL,
  companyDomain: COMPANY_DOMAIN,
  countryFilter: 'India',
  atsPlatform: 'official-company-site-no-public-careers',
  paginationStrategy: 'verified-homepage-plus-resume-only-careers-page',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-careers-page-without-public-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
}

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bjob description\b/i,
  /\bapply now\b/i,
  /\bview opportunity\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /href=["'][^"']*\/jobs\/[^"']*["']/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
]

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    text: await response.text(),
  }
}

const normalizeWhitespace = (value = '') =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*ABM - Digital Government that Works \| Leader in e-Municipality\s*<\/title>/i.test(page)
    && /ABM KNOWLEDGEWARE LTD\.\s*\(ABM\), IT Software and Services Company \(BSE 531161\)/i.test(page)
    && /exclusive focus on e-Governance since 1998/i.test(page)
    && /Citizen Services delivered last year/i.test(page)
    && /Digital Government services/i.test(page)
    && /href=["'](?:https:\/\/abmindia\.com)?\/home\/abm_career["']/i.test(page)
    && text.includes('exploring career opportunities with us')
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /<title>\s*Career opportunities \| ABM Knowledgeware Ltd\s*<\/title>/i.test(page)
    && /WHY JOIN ABM KNOWLEDGEWARE\?/i.test(page)
    && text.includes('For job Opening contact careers@abmindia.com')
    && /ABM Knowledgeware Limited\./i.test(page)
    && /Bandra\(West\) Mumbai- 400 050, India\./i.test(page)
}

export const pageExposesPublicJobListings = (html = '') =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createAbmKnowledgewareScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!homepage.ok || !hasOfficialHomepageSignal(homepage.text)) {
      throw new Error('The official ABM Knowledgeware homepage no longer matches the verified public surface')
    }

    if (pageExposesPublicJobListings(homepage.text)) {
      throw new Error('The official ABM Knowledgeware homepage appears to expose public job listings')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (!careersPage.ok || !hasOfficialCareersSignal(careersPage.text)) {
      throw new Error('The official ABM Knowledgeware careers page no longer matches the verified resume-only surface')
    }

    if (pageExposesPublicJobListings(careersPage.text)) {
      throw new Error('The official ABM Knowledgeware careers page appears to expose public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createAbmKnowledgewareScraper().run(options)

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
