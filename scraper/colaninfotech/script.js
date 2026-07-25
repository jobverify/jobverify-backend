import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { COLAN_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = COLAN_INFOTECH_CATALOG
export const SOURCE = COLAN_INFOTECH_CATALOG.source
export const COMPANY = COLAN_INFOTECH_CATALOG.companyName
export const CAREERS_URL = COLAN_INFOTECH_CATALOG.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Career - Colan Infotech/i.test(page)
    && /Build your future at Colan/i.test(text)
    && /LATEST JOBS/i.test(text)
}

const extractField = (section, label) =>
  normalizeWhitespace(
    String(section ?? '').match(new RegExp(`${label}\\s*:?\\s*([^<\\n]+)`, 'i'))?.[1] ?? '',
  )

const extractListItems = (html) =>
  Array.from(String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi))
    .map((match) => normalizeWhitespace(match[1]))
    .filter(Boolean)

const extractSections = (html = '') =>
  Array.from(String(html ?? '').matchAll(/<section[^>]*class="job-detail"[^>]*>([\s\S]*?)<\/section>/gi))
    .map((match) => match[1])

export const createColanInfotechScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Colan Infotech careers page no longer matches the verified first-party surface')
    }

    const jobs = extractSections(careersHtml).map((section) => {
      const location = extractField(section, 'Location')
      const city = normalizeWhitespace(location)
      const descriptionItems = extractListItems(section)

      return {
        title: extractField(section, 'Designation'),
        company: COMPANY,
        department: null,
        location: city ? `${city}, India` : null,
        city: city || null,
        state: null,
        country: 'India',
        jobId: extractField(section, 'Job Code'),
        requisitionId: extractField(section, 'Job Code'),
        sourceUrl: CAREERS_URL,
        applyUrl: CAREERS_URL,
        employmentType: extractField(section, 'Job type') || null,
        experienceRequired: extractField(section, 'Experience') || null,
        minimumQualification: extractField(section, 'Qualification') || null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: descriptionItems.join(' '),
        source: SOURCE,
        link: CAREERS_URL,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }
    }).filter((job) => job.title && job.jobId && job.jobDescription)

    if (jobs.length === 0) {
      throw new Error('Colan Infotech careers page no longer yields inline openings')
    }

    return jobs
  },
})

export const run = async (options = {}) => createColanInfotechScraper().run(options)

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
