import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import HOSTBOOKS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = HOSTBOOKS_CATALOG
export const SOURCE = HOSTBOOKS_CATALOG.source
export const COMPANY = HOSTBOOKS_CATALOG.companyName
export const CAREERS_URL = HOSTBOOKS_CATALOG.companyCareerPage
export const VERIFIED_ON = HOSTBOOKS_CATALOG.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const MONTHS = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<\/(li|p|div|h[1-6]|tr|td|th|ul|ol)>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#39;|&apos;|&#x27;|&#8217;|&rsquo;/gi, "'")
  .replace(/&#8211;|&#8212;|&ndash;|&mdash;/gi, '-')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toIsoDate = (value) => {
  const match = normalizeWhitespace(value).match(/^(\d{1,2})\s+([A-Za-z]{3}),\s+(\d{4})$/)
  if (!match) return null

  const day = match[1].padStart(2, '0')
  const month = MONTHS[match[2].toLowerCase()]
  const year = match[3]

  return month ? `${year}-${month}-${day}` : null
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const extractLabeledValue = (block, label) => {
  const regex = new RegExp(`${label}\\s*:\\s*([^<\\n]+)`, 'i')
  return normalizeWhitespace(String(block ?? '').match(regex)?.[1]) || null
}

const inferCity = (location) => {
  const normalized = normalizeWhitespace(location)
  if (!normalized || /pan india/i.test(normalized)) return null
  return normalizeWhitespace(normalized.split(',')[0]) || null
}

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Current Opening')
    && normalized.includes('Submit Your Resume')
    && normalized.includes('Java Developer')
    && normalized.includes('Finance Manager')
}

export const extractOpeningSummaryRows = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const openingsSlice = normalized.includes('Current Opening')
    ? normalized.split('Current Opening')[1].split('Submit Your Resume')[0]
    : normalized
  const rows = new Map()

  for (const match of openingsSlice.matchAll(
    /([A-Za-z0-9.&/()\- ]+?)\s+(\d{1,2}\s+[A-Za-z]{3},\s+\d{4})\s+([0-9][A-Za-z0-9 +\-()]*years?)\s+View Job/gi,
  )) {
    const title = normalizeWhitespace(match[1])
    if (!title) continue

    rows.set(title, {
      postingDate: toIsoDate(match[2]),
      experienceRequired: normalizeWhitespace(match[3]) || null,
    })
  }

  return rows
}

export const extractOpeningSections = (html = '') => {
  const summaryRows = extractOpeningSummaryRows(html)
  const sections = []

  for (const match of String(html ?? '').matchAll(
    /<h5[^>]*>\s*([^<]+?)\s*<\/h5>([\s\S]*?)(?=<h5[^>]*>|<h3[^>]*>\s*Submit Your Resume|$)/gi,
  )) {
    const title = normalizeWhitespace(match[1])
    const block = match[2]
    const summary = summaryRows.get(title) || {}
    const location = extractLabeledValue(block, 'Work Location') || extractLabeledValue(block, 'Location')
    const department = extractLabeledValue(block, 'Division/Department')
    const experienceRequired = (
      extractLabeledValue(block, 'Experience')
      || summary.experienceRequired
    )

    sections.push({
      title,
      company: COMPANY,
      department,
      location,
      city: inferCity(location),
      country: 'India',
      jobId: slugify(title),
      requisitionId: slugify(title),
      sourceUrl: `${CAREERS_URL}#${slugify(title)}`,
      applyUrl: CAREERS_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: summary.postingDate || null,
      closingDate: null,
      jobDescription: normalizeWhitespace(block) || null,
    })
  }

  return sections
}

const buildJobsFromSummaryRows = (summaryRows) => [...summaryRows.entries()].map(([title, summary]) => ({
  title,
  company: COMPANY,
  department: null,
  location: null,
  city: null,
  country: 'India',
  jobId: slugify(title),
  requisitionId: slugify(title),
  sourceUrl: `${CAREERS_URL}#${slugify(title)}`,
  applyUrl: CAREERS_URL,
  employmentType: null,
  experienceRequired: summary.experienceRequired || null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: summary.postingDate || null,
  closingDate: null,
  jobDescription: null,
}))

export const createHostBooksScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified HostBooks careers page no longer matches the trusted first-party surface')
    }

    const detailJobs = extractOpeningSections(careersHtml)
    const jobs = detailJobs.length > 0
      ? detailJobs
      : buildJobsFromSummaryRows(extractOpeningSummaryRows(careersHtml))

    if (jobs.length === 0) {
      throw new Error('The verified HostBooks careers page no longer exposes the trusted current-opening surface')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createHostBooksScraper(options).run(options)

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
