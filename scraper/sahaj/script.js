import path from 'node:path'
import { fileURLToPath } from 'node:url'

import SAHAJ_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = SAHAJ_CATALOG
export const SOURCE = SAHAJ_CATALOG.source
export const COMPANY = SAHAJ_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = SAHAJ_CATALOG.officialBrandName
export const VERIFIED_ON = SAHAJ_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = SAHAJ_CATALOG.verifiedSurfaceSummary
export const HOMEPAGE_URL = SAHAJ_CATALOG.homepageUrl
export const ABOUT_PAGE_URL = SAHAJ_CATALOG.aboutPageUrl
export const JOIN_US_URL = SAHAJ_CATALOG.companyCareerPage
export const JOB_ROLE_URL = SAHAJ_CATALOG.jobRolePageUrl

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;|&#8220;|&#8221;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&nbsp;/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const buildPageResponse = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractHomepageJoinUsUrl = (html = '') =>
  String(html ?? '').match(/href=["'](https:\/\/retail\.sahaj\.co\.in\/joinuspage)["']/i)?.[1] ?? null

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')

  return /Sahaj Retail Limited\s*\|\s*India(?:’|')?s Largest Rural Digital/i.test(page)
    && extractHomepageJoinUsUrl(page) === JOIN_US_URL
    && /Why partner with Sahaj/i.test(page)
    && /Sahaj Mitr \(Retailer\)/i.test(page)
    && /support@sahaj\.co\.in/i.test(page)
}

export const hasOfficialAboutPageSignal = (html = '') => {
  const page = String(html ?? '')

  return /About Sahaj/i.test(page)
    && /About Us/i.test(page)
    && /Sahaj Retail Limited,\s*has delved into bridging the digital divide/i.test(page)
    && /Core Values/i.test(page)
    && /Meet Our\s+Leadership/i.test(page)
}

export const hasOfficialJoinUsSignal = (html = '') => {
  const page = String(html ?? '')

  return /Become a Sahaj Mitr\s*\|\s*Join Sahaj Retail Limited/i.test(page)
    && /Applicant Registration/i.test(page)
    && /Mobile Number with OTP Verification/i.test(page)
    && /Valid PAN Card \(Linked with Aadhaar\)/i.test(page)
    && /Why partner with Sahaj/i.test(page)
    && /Sahaj Mitr/i.test(page)
}

export const hasOfficialJobRoleSignal = (html = '') => {
  const page = String(html ?? '')

  return /Job Role page/i.test(page)
    && /Sahaj has tie ups with the organization/i.test(page)
    && /30 job roles are on the portal/i.test(page)
    && /Driver,\s*Electrician,\s*Plumber\s*&\s*Security Guard/i.test(page)
    && /registered yourself on the job role/i.test(page)
}

export const hasPublicCompanyJobsSignal = (html = '') => {
  const page = String(html ?? '')

  return /"@type"\s*:\s*"JobPosting"/i.test(page)
    || /\b(Current Openings|Open Positions|Career Opportunities)\b/i.test(page)
    || /href=["'][^"']*\/careers\/[^"']+["'][^>]*>\s*Apply Now/i.test(page)
}

export const createSahajScraper = () => ({
  async run({
    fetchPage = buildPageResponse,
  } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Sahaj verified homepage no longer matches the official first-party surface')
    }

    const aboutPage = await fetchPage(ABOUT_PAGE_URL)
    if (!hasOfficialAboutPageSignal(aboutPage.html)) {
      throw new Error('Sahaj verified about page no longer matches the official first-party surface')
    }

    const joinUsPage = await fetchPage(JOIN_US_URL)
    if (!hasOfficialJoinUsSignal(joinUsPage.html)) {
      throw new Error('Sahaj verified join-us page no longer matches the official first-party surface')
    }

    const jobRolePage = await fetchPage(JOB_ROLE_URL)
    if (!hasOfficialJobRoleSignal(jobRolePage.html)) {
      throw new Error('Sahaj verified job-role page no longer matches the official first-party surface')
    }

    if (
      hasPublicCompanyJobsSignal(homepage.html)
      || hasPublicCompanyJobsSignal(aboutPage.html)
      || hasPublicCompanyJobsSignal(joinUsPage.html)
      || hasPublicCompanyJobsSignal(jobRolePage.html)
    ) {
      throw new Error('Sahaj verified first-party surfaces now appear to expose public company jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createSahajScraper().run(options)

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
