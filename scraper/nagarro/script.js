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
export const DETAIL_FETCH_CONCURRENCY = 8

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
  const hasLegacyIndiaBuckets =
    /Bengaluru,\s*,?\s*India/i.test(page)
    && /Remote,\s*,?\s*India/i.test(page)
  const hasCurrentBoardChrome =
    /\bHome Page\b/i.test(page)
    && /\bSearch job openings\b/i.test(page)
    && /\bClear search results\b/i.test(page)

  return /Careers at Nagarro/i.test(page)
    && /Jobs at Nagarro/i.test(page)
    && (hasLegacyIndiaBuckets || hasCurrentBoardChrome)
}

const hasRichPublicDetailPayload = (job = {}) => (
  [
    job.jobDescription,
    job.minimumQualification,
    job.preferredQualification,
  ]
    .map((value) => normalizeWhitespace(value))
    .filter(Boolean)
    .join(' ')
    .length >= 120
)

const NAGARRO_MOTIVATIONAL_SHELL_PHRASES = [
  'by this point in your career, it is not just about the tech you know or how well you can code',
  'it is about what more you want to do with that knowledge',
  'were you given the tools to go beyond solving for x',
  'can you help your teammates proceed in the right direction',
  'you have begun to prove your worth in our industry',
  'at nagarro, we love breaking new ground and doing unprecedented stuff',
]

const hasMotivationalShellDetailPayload = (job = {}) => {
  const description = normalizeWhitespace(job.jobDescription)?.toLowerCase() || ''

  return Boolean(description)
    && NAGARRO_MOTIVATIONAL_SHELL_PHRASES.some((phrase) => description.includes(phrase))
}

const hasPrivacyNoticeOnlyDetailPayload = (job = {}) => {
  const description = normalizeWhitespace(job.jobDescription)
  const minimumQualification = normalizeWhitespace(job.minimumQualification)
  const preferredQualification = normalizeWhitespace(job.preferredQualification)

  return !description
    && !minimumQualification
    && Boolean(preferredQualification)
    && /application privacy notice|applicant(?:%20|\s+)privacy(?:%20|\s+)notice/i.test(preferredQualification)
}

const buildSparsePublicDetailSummary = (job = {}) =>
  `Official Nagarro SmartRecruiters posting for ${job.title}. `
  + 'The public detail API exposed only the applicant privacy notice, '
  + 'so the live source posting should be reviewed for responsibilities and experience requirements.'

const buildMotivationalShellSummary = (job = {}) =>
  `Official Nagarro SmartRecruiters posting for ${job.title}. `
  + 'The public detail API exposed only generic Nagarro motivational copy for this role, '
  + 'so the live source posting should be reviewed for responsibilities and experience requirements.'

const resolvePreferredPublicDescription = (job = {}) => {
  if (hasMotivationalShellDetailPayload(job)) {
    return buildMotivationalShellSummary(job)
  }

  if (job.jobDescription) {
    return job.jobDescription
  }

  if (job.minimumQualification) {
    return job.minimumQualification
  }

  if (hasPrivacyNoticeOnlyDetailPayload(job)) {
    return buildSparsePublicDetailSummary(job)
  }

  return null
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
      concurrency: DETAIL_FETCH_CONCURRENCY,
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
      jobDescription: resolvePreferredPublicDescription(job),
      department: typeof job.department === 'string' ? job.department : null,
      publicExperienceChecked:
        job.publicExperienceChecked === true
        || hasRichPublicDetailPayload(job)
        || hasPrivacyNoticeOnlyDetailPayload(job),
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
