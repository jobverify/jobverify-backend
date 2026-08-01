import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../../scraper-support/apiPortal/engine.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import NAGARRO_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = NAGARRO_CATALOG
export const SOURCE = NAGARRO_CATALOG.source
export const COMPANY = NAGARRO_CATALOG.companyName
export const OFFICIAL_BRAND_NAME = NAGARRO_CATALOG.officialBrandName
export const VERIFIED_ON = NAGARRO_CATALOG.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = NAGARRO_CATALOG.verifiedSurfaceSummary
export const CAREERS_LANDING_URL = NAGARRO_CATALOG.careersLandingPageUrl
export const JOB_SEARCH_URL = NAGARRO_CATALOG.companyCareerPage
export const SMARTRECRUITERS_COMPANY_IDENTIFIER = 'Nagarro1'
export const SMARTRECRUITERS_BOARD_URL = NAGARRO_CATALOG.smartRecruitersBoardUrl
export const SMARTRECRUITERS_LISTING_API_URL = NAGARRO_CATALOG.smartRecruitersListingApiUrl
export const SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE =
  NAGARRO_CATALOG.smartRecruitersDetailApiUrlTemplate
export const SMARTRECRUITERS_APPLY_URL =
  'https://join.smartrecruiters.com/Nagarro1/338a6454-a0d3-4121-a6c2-51696acb91a3-website-applications'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

export const extractSmartRecruitersCompanyIdentifier = (value) => {
  const match = String(value ?? '').match(/smartrecruiters\.com\/([^/?#]+)/i)
  return match?.[1] || null
}

export const hasOfficialCareersLandingSignal = (html = '') => {
  const page = normalizeWhitespace(html) || ''

  return /Careers \| Nagarro/i.test(page)
    && /Thinking about becoming a Nagarrian\?/i.test(page)
    && /Find more details and open positions on these locations/i.test(page)
    && /\bIndia\b/i.test(page)
}

export const hasOfficialJobSearchSignal = (html = '') => {
  const page = normalizeWhitespace(html) || ''

  return /Job Search \| Career opportunities with Nagarro \| Explore now/i.test(page)
    && /Your future starts here/i.test(page)
    && /Didn't find any open position\?/i.test(page)
    && page.includes(SMARTRECRUITERS_APPLY_URL)
}

export const hasVerifiedSmartRecruitersBoardSignal = (html = '') => {
  const page = normalizeWhitespace(html) || ''

  return /Careers at Nagarro/i.test(page)
    && /Jobs at Nagarro/i.test(page)
    && /Bengaluru, India/i.test(page)
    && /Remote, India/i.test(page)
}

const createApiProvider = () => ({
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: JOB_SEARCH_URL,
  countryFilter: 'India',
  config: {
    request: {
      method: 'GET',
      query: {
        limit: '100',
        country: 'in',
      },
    },
    pagination: {
      strategy: 'offset-limit',
      pageSize: 100,
      offsetParam: 'offset',
      limitParam: 'limit',
      resultsPath: 'content',
      totalCountPath: 'totalFound',
    },
    mapping: {
      title: 'name',
      location: 'location.fullLocation',
      jobId: 'id',
      requisitionId: 'refNumber',
      sourceUrl: 'postingUrl',
      applyUrl: 'applyUrl',
      department: 'department.label',
      employmentType: 'typeOfEmployment.label',
      experienceLevel: 'experienceLevel.label',
      postingDate: 'releasedDate',
    },
    detail: {
      enabled: true,
      urlTemplate: SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE,
      method: 'GET',
      mapping: {
        jobDescription: 'jobAd.sections.jobDescription.text',
        minimumQualification: 'jobAd.sections.qualifications.text',
        preferredQualification: 'jobAd.sections.additionalInformation.text',
      },
    },
    discovery: {
      listingApiUrl: SMARTRECRUITERS_LISTING_API_URL,
    },
  },
})

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json,text/plain,*/*',
    Referer: JOB_SEARCH_URL,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const createNagarroScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersLandingHtml = await fetchText(CAREERS_LANDING_URL)
    if (!hasOfficialCareersLandingSignal(careersLandingHtml)) {
      throw new Error('Nagarro official careers landing page changed materially')
    }

    const jobSearchHtml = await fetchText(JOB_SEARCH_URL)
    if (!hasOfficialJobSearchSignal(jobSearchHtml)) {
      throw new Error('Nagarro official job-search page changed materially')
    }

    const smartRecruitersBoardHtml = await fetchText(SMARTRECRUITERS_BOARD_URL)
    if (!hasVerifiedSmartRecruitersBoardSignal(smartRecruitersBoardHtml)) {
      throw new Error('Nagarro verified SmartRecruiters board changed materially')
    }

    const jobs = await runApiPortalScraper({
      provider: createApiProvider(),
      fetchJson,
    })

    const verifiedJobs = jobs.map((job) => ({
      ...job,
      department: typeof job.department === 'string' ? job.department : null,
    }))

    for (const job of verifiedJobs) {
      const companyIdentifier = extractSmartRecruitersCompanyIdentifier(
        job.applyUrl || job.sourceUrl || job.link,
      )

      if (companyIdentifier !== SMARTRECRUITERS_COMPANY_IDENTIFIER) {
        throw new Error('Nagarro SmartRecruiters company identifier changed on the public ATS jobs payload')
      }
    }

    return Number.isFinite(maxJobs) ? verifiedJobs.slice(0, maxJobs) : verifiedJobs
  },
})

export const run = async (options = {}) => createNagarroScraper(options).run(options)

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
