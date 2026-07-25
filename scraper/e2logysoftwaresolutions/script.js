import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'e2logysoftwaresolutions'
export const COMPANY = 'E2logy Software Solutions'
export const COMPANY_DOMAIN = 'e2logy.com'
export const CAREERS_URL = 'https://e2logy.com/careers/'
export const ZOHO_SITE = 'https://e2logy.zohorecruit.com'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeEmploymentType = (value) => {
  const cleaned = normalizeWhitespace(value).toLowerCase()
  if (cleaned === 'full time') return 'Full-time'
  return cleaned ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}` : null
}

export const buildZohoJobsApiUrl = () =>
  `${ZOHO_SITE}/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite`

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*E2logy Careers \| Join a Dynamic Team of IT Professionals\s*<\/title>/i.test(page)
    && /rec_embed_js\.load/i.test(page)
    && /page_name:\s*"Careers"/i.test(page)
    && /site:\s*"https:\/\/e2logy\.zohorecruit\.com"/i.test(page)
}

export const extractZohoJobs = (payload) => (payload?.data ?? [])
  .filter((job) => normalizeWhitespace(job?.Country) === 'India')
  .map((job) => ({
    title: normalizeWhitespace(job.Posting_Title || job.Job_Opening_Name),
    company: COMPANY,
    department: normalizeWhitespace(job.Industry) || null,
    location: `${normalizeWhitespace(job.City)}, India`,
    city: normalizeWhitespace(job.City) || null,
    country: 'India',
    jobId: String(job.id),
    requisitionId: String(job.id),
    sourceUrl: normalizeWhitespace(job.$url),
    applyUrl: normalizeWhitespace(job.$url),
    employmentType: normalizeEmploymentType(job.Job_Type),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: null,
  }))

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return response.text()
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json,text/plain,*/*',
    },
  })

  return response.json()
}

export const createE2logySoftwareSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('E2logy careers page no longer matches the verified first-party Zoho widget surface')
    }

    return extractZohoJobs(await fetchJson(buildZohoJobsApiUrl())).map((job) => ({
      ...job,
      source: SOURCE,
      companyDomain: COMPANY_DOMAIN,
      atsPlatform: 'official-careers-page-embedded-zoho-recruit',
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createE2logySoftwareSolutionsScraper().run(options)

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
