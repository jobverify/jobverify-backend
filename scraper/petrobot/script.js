import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { runApiPortalScraper } from '../../scraper-support/apiPortal/engine.js'
import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'petrobot'
export const COMPANY = 'PetroBot'
export const CAREERS_URL = 'https://petrobot.co.in/company/careers'
export const SMARTRECRUITERS_BOARD_URL =
  'https://careers.smartrecruiters.com/PetroBotTechnologiesPvtLtd'
export const SMARTRECRUITERS_LISTING_API_URL =
  'https://api.smartrecruiters.com/v1/companies/PetroBotTechnologiesPvtLtd/postings'
export const SMARTRECRUITERS_DETAIL_API_URL_TEMPLATE =
  'https://api.smartrecruiters.com/v1/companies/PetroBotTechnologiesPvtLtd/postings/{{jobId}}'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

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

const normalizeUrl = (value) => {
  try {
    return new URL(value).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersSignal = (html) => {
  const page = normalizeWhitespace(html) || ''

  return /Careers at PetroBot - Robotics and NDT Inspection Jobs/i.test(page)
    && /Join our team and help build the future of robotic inspection technology\./i.test(page)
    && /\bOpen Positions\b/i.test(page)
    && /View all positions on SmartRecruiters/i.test(page)
    && /PetroBot, inspecting assets where humans shouldn't have to go\./i.test(page)
    && /Developed in India\./i.test(page)
    && /Funded by ONGC & HPCL\./i.test(page)
  }

export const extractVerifiedJobsBoardUrl = (html) => {
  const match = String(html ?? '').match(
    /<a[^>]+href="([^"]*careers\.smartrecruiters\.com\/PetroBotTechnologiesPvtLtd[^"]*)"[^>]*>[\s\S]*?View all positions on SmartRecruiters[\s\S]*?<\/a>/i,
  )
  const resolved = normalizeUrl(match?.[1])

  if (!resolved) return null
  return resolved
}

const createApiProvider = () => ({
  source: SOURCE,
  companyName: COMPANY,
  companyCareerPage: CAREERS_URL,
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
    resultFilter: {
      include: [
        {
          field: 'location',
          pattern: '\\bIndia\\b',
        },
      ],
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
    Referer: CAREERS_URL,
    ...(options.headers || {}),
  },
  body: options.body,
  label: SOURCE,
  timeoutMs: 15000,
})

export const createPetroBotScraper = ({
  maxJobs = null,
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('PetroBot official careers surface changed and no longer matches the verified first-party page')
    }

    const boardUrl = extractVerifiedJobsBoardUrl(careersHtml)
    if (boardUrl !== SMARTRECRUITERS_BOARD_URL) {
      throw new Error('PetroBot verified SmartRecruiters handoff changed on the official careers page')
    }

    const jobs = await runApiPortalScraper({
      provider: createApiProvider(),
      fetchJson,
    })

    const normalizedJobs = jobs.map((job) => ({
      ...job,
      department: typeof job.department === 'string' ? job.department : null,
    }))

    return Number.isFinite(maxJobs) ? normalizedJobs.slice(0, maxJobs) : normalizedJobs
  },
})

export const run = async (options = {}) => createPetroBotScraper(options).run(options)

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
