import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { ZIETA_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const APPLY_URL = `${CAREERS_URL}#applynow`

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#8217;/gi, "'")
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return normalized.includes('Experienced professionals')
    && normalized.includes('Title : LEAD SYSTEMS ANALYST')
    && normalized.includes('Apply here')
}

const parseInlineOpening = (normalized) => {
  const match = normalized.match(
    /Title\s*:\s*(.+?)\s+Description\s*:\s*(.+?)\s+Require\s*:\s*(.+?)\s+Apply with resume to\s*:\s*(.+?)\s+Apply here/i,
  )

  if (!match) return null

  const title = match[1].trim()
  const description = match[2].trim()
  const requirements = match[3].trim()
  const hasThreeYearsExperience = /\bthree years\b/i.test(requirements)

  return {
    title,
    location: 'Roswell, GA, United States',
    country: 'United States',
    sourceUrl: CAREERS_URL,
    applyUrl: APPLY_URL,
    experienceRequired: hasThreeYearsExperience ? '3 years' : null,
    jobDescription: `${description} ${requirements}`.trim(),
  }
}

export const extractJobs = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const job = parseInlineOpening(normalized)
  return job ? [job] : []
}

export const createZietaTechnologiesScraper = ({
  maxJobs = null,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Zieta Technologies inline careers opening changed materially')
    }

    const jobs = extractJobs(careersHtml)
    if (jobs.length === 0) {
      throw new Error('The verified Zieta Technologies careers page no longer exposes the inline opening contract')
    }

    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => {
      const slug = slugify(job.title)

      return {
        ...job,
        company: COMPANY,
        department: null,
        city: 'Roswell',
        state: 'GA',
        jobId: slug,
        requisitionId: slug,
        employmentType: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        remoteStatus: null,
        source: SOURCE,
        link: job.applyUrl || job.sourceUrl,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }
    })
  },
})

export const run = async (options = {}) => createZietaTechnologiesScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
