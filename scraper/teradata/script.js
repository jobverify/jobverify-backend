import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchJsonWithRetry, fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import TERADATA_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = TERADATA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const JOBS_API_URL = PROVIDER_METADATA.jobsApiUrl

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = String(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialTeradataCareersSignals = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return /<title[^>]*>\s*Careers \| Teradata/i.test(page)
    && text.includes('Careers at Teradata')
    && text.includes('Explore careers')
    && /https:\/\/careers\.teradata\.com/i.test(page)
}

export const buildSearchJobsRequestBody = ({ first = 100, start = 0 } = {}) => ({
  operationName: 'searchJobs',
  variables: {
    hasPositionTitle: false,
    hasEmploymentType: false,
    hasJobCategory: false,
    hasClassificationType: false,
    hasGradeLevel: false,
    hasRecruiter: false,
    hasHiringManager: false,
    hasUserDefined1: false,
    hasUserDefined2: false,
    hasUserDefined3: false,
    hasUserDefined4: false,
    hasUserDefined5: false,
    hasUserDefined6: false,
    hasUserDefined7: false,
    hasUserDefined8: false,
    hasUserDefined9: false,
    hasUserDefined10: false,
    hasUserDefined11: false,
    hasUserDefined12: false,
    hasUserDefined13: false,
    hasUserDefined14: false,
    hasUserDefined15: false,
    hasUserDefined16: false,
    hasUserDefined17: false,
    hasUserDefined18: false,
    hasUserDefined19: false,
    hasUserDefined20: false,
    hasUserDefined21: false,
    hasUserDefined22: false,
    hasUserDefined23: false,
    hasUserDefined24: false,
    hasUserDefined25: false,
    hasUserDefined26: false,
    hasUserDefined27: false,
    hasUserDefined28: false,
    hasUserDefined29: false,
    hasUserDefined30: false,
    hasUserDefined31: false,
    hasUserDefined32: false,
    hasUserDefined33: false,
    hasUserDefined34: false,
    hasUserDefined35: false,
    hasUserDefined36: false,
    hasUserDefined37: false,
    hasUserDefined38: false,
    hasUserDefined39: false,
    hasUserDefined40: false,
    hasUserDefined41: false,
    hasUserDefined42: false,
    hasUserDefined43: false,
    hasUserDefined44: false,
    hasUserDefined45: false,
    hasUserDefinedBit1: false,
    hasUserDefinedDecimal1: false,
    hasUserDefinedDecimal2: false,
    hasUserDefinedDecimal3: false,
    hasUserDefinedDecimal4: false,
    hasUserDefinedDecimal5: false,
    hasUserDefinedDecimal6: false,
    hasUserDefinedDecimal7: false,
    hasUserDefinedDecimal8: false,
    hasUserDefinedDecimal9: false,
    hasUserDefinedDecimal10: false,
    hasUserDefinedDecimal11: false,
    hasUserDefinedDecimal12: false,
    hasUserDefinedDecimal13: false,
    hasUserDefinedDecimal14: false,
    hasUserDefinedDecimal15: false,
    hasUserDefinedDecimal16: false,
    hasUserDefinedDecimal17: false,
    hasUserDefinedDecimal18: false,
    hasUserDefinedDecimal19: false,
    hasUserDefinedDecimal20: false,
    hasUserDefinedDecimal21: false,
    hasUserDefinedDecimal22: false,
    hasUserDefinedDecimal23: false,
    hasUserDefinedDecimal24: false,
    hasUserDefinedDecimal25: false,
    hasUserDefinedDecimal50: false,
    hasUserDefinedDecimal51: false,
    hasUserDefinedSmallText1: false,
    hasUserDefinedSmallText2: false,
    hasUserDefinedSmallText3: false,
    hasUserDefinedSmallText4: false,
    hasUserDefinedSmallText5: false,
    hasUserDefinedMediumText1: false,
    hasUserDefinedMediumText2: false,
    hasUserDefinedMediumText3: false,
    hasUserDefinedMediumText4: false,
    hasUserDefinedMediumText5: false,
    hasUserDefinedLargeText1: false,
    hasUserDefinedLargeText2: false,
    hasUserDefinedLargeText3: false,
    hasUserDefinedLargeText4: false,
    hasUserDefinedLargeText5: false,
    hasCurrencyCode: false,
    hasNumPositionsOpen: false,
    hasSalaryRange: false,
    hasPrimaryLocation: false,
    query: '',
    first,
    start,
    filters: {
      location: [],
      workplaceType: [],
      jobCategory: [],
      positionType: [],
    },
  },
  extensions: {
    trustedDocument: {
      id: 'search-jobs',
    },
  },
})

const isIndiaJob = (node = {}) => {
  const locationText = [
    node.primaryLocation,
    ...(Array.isArray(node.places) ? node.places.map((place) => place?.name) : []),
  ]
    .filter(Boolean)
    .join(' ')

  return /\bindia\b/i.test(locationText)
}

const buildJobUrl = (job = {}) => {
  const number = normalizeWhitespace(job.number || job.key)
  const title = normalizeWhitespace(job.title)
  if (!number || !title) return null
  return `https://careers.teradata.com/jobs/${number}/${slugify(title)}`
}

export const extractJobs = (payload = {}) => {
  const nodes = payload?.data?.searchJobs?.results?.nodes
  if (!Array.isArray(nodes)) return []

  return nodes
    .filter((node) => isIndiaJob(node))
    .map((node) => {
      const title = normalizeWhitespace(node.title)
      const sourceUrl = buildJobUrl(node)
      const places = Array.isArray(node.places) ? node.places.map((place) => normalizeWhitespace(place?.name)).filter(Boolean) : []
      const location = normalizeWhitespace(node.primaryLocation) || places[0] || null
      const city = location?.split(',')[0] || null

      return {
        title,
        company: COMPANY,
        department: null,
        location,
        city,
        country: 'India',
        jobId: normalizeWhitespace(node.key || node.number),
        requisitionId: normalizeWhitespace(node.number),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: normalizeWhitespace(node.positionType?.name),
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeWhitespace(node.postedOn)?.slice(0, 10) || null,
        closingDate: null,
        jobDescription: normalizeWhitespace(node.descriptionHTML),
        workplaceType: normalizeWhitespace(node.workplaceType),
      }
    })
    .filter((job) => job.title && job.jobId && job.sourceUrl)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: `${SOURCE}-html`,
  timeoutMs: 15000,
})

const defaultFetchJson = (url, options = {}) => fetchJsonWithRetry(url, {
  method: options.method || 'GET',
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  },
  body: options.body,
  label: `${SOURCE}-json`,
  timeoutMs: 20000,
})

export const createTeradataScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    fetchJson = defaultFetchJson,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialTeradataCareersSignals(careersHtml)) {
      throw new Error('Teradata verified first-party careers page no longer matches the Gr8People handoff')
    }

    const payload = await fetchJson(JOBS_API_URL, {
      method: 'POST',
      body: JSON.stringify(buildSearchJobsRequestBody()),
    })
    const jobs = extractJobs(payload)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createTeradataScraper(options).run(options)

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
