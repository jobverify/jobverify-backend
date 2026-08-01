import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = TECNICS_INTEGRATION_TECHNOLOGIES_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_URL = PROVIDER_METADATA.applyUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Careers\s*\|\s*Tecnics\s*<\/title>/i.test(page)
    && /APAC/i.test(page)
    && /Sr\. SAP ABAP Developer/i.test(page)
    && /Senior DevOps Engineer/i.test(page)
    && /careers@tecnics\.com/i.test(page)
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(
    /<section[^>]*class=["'][^"']*job-card[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
  )) {
    const block = match[1]
    const title = normalizeWhitespace(block.match(/<h2[^>]*>[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>[\s\S]*?<\/h2>/i)?.[1])
    const location = normalizeWhitespace(block.match(/Location:\s*([^<]+)/i)?.[1])
    const applyUrl = normalizeWhitespace(block.match(/href=["'](mailto:[^"']+)["']/i)?.[1])
    const jobId = slugify(title)

    if (!title || !location || !applyUrl || !jobId || !/hyderabad/i.test(location)) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'Hyderabad, Telangana, India',
      city: 'Hyderabad',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl,
      employmentType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    })
  }

  return jobs
}

export const createTecnicsIntegrationTechnologiesScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Tecnics Integration Technologies careers surface no longer matches the trusted first-party page')
    }

    const jobs = extractJobs(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createTecnicsIntegrationTechnologiesScraper().run(options)

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
