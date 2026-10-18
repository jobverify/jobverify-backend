import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fetchTextWithRetry, fetchJsonWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'e2logysoftwaresolutions'
export const COMPANY = 'E2logy Software Solutions'
export const COMPANY_DOMAIN = 'e2logy.com'
export const CAREERS_URL = 'https://e2logy.com/careers'
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

const tagTexts = (html, tag) => [...String(html).matchAll(
  new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'gi'),
)].map((match) => normalizeWhitespace(match[1].replace(/<[^>]*>/g, ' ')))

export const hasVerifiedEmptyCareersSurface = (html) => {
  const page = String(html ?? '')
  const sections = [...page.matchAll(/<section\b[^>]*\sid=["']positions["'][^>]*>([\s\S]*?)<\/section>/gi)]
  if (sections.length !== 1) return false
  const positions = sections[0][1]
  const resumeLinks = [...positions.matchAll(/<a\b[^>]*\shref=["']([^"']+)["'][^>]*>/gi)]
  return tagTexts(page, 'title')[0] === 'Careers at E2logy | Join Our AI and Software Team'
    && tagTexts(page, 'h1').join('') === 'Work with us on AI and software projects'
    && tagTexts(positions, 'h2').length === 1
    && tagTexts(positions, 'h2')[0] === 'Jobs open right now'
    && tagTexts(positions, 'h3').length === 1
    && tagTexts(positions, 'h3')[0] === 'No current openings'
    && tagTexts(positions, 'p').length === 1
    && tagTexts(positions, 'p')[0] === 'All our roles are filled at the moment. You can still send us your resume and we will keep it for the next opening.'
    && resumeLinks.length === 1
    && resumeLinks[0][1] === 'mailto:careers@e2logy.com?subject=Career%20Application%3A%20General'
    && !/<(?:button|form|iframe)\b/i.test(positions)
    && !/rec_embed_js\.load|e2logy\.zohorecruit\.com|JobPosting/i.test(page)
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

const defaultFetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
  headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8' },
  attempts: 1, label: SOURCE, timeoutMs: 15000, signal,
})

const defaultFetchJson = (url, { signal } = {}) => fetchJsonWithRetry(url, {
  headers: { 'User-Agent': USER_AGENT, Accept: 'application/json,text/plain,*/*' },
  attempts: 1, label: SOURCE, timeoutMs: 15000, signal,
})

export const createE2logySoftwareSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, fetchJson = defaultFetchJson, signal } = {}) {
    signal?.throwIfAborted()
    const careersHtml = await fetchText(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    if (hasVerifiedEmptyCareersSurface(careersHtml)) return []

    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('E2logy careers page no longer matches the verified first-party careers surface')
    }

    return extractZohoJobs(await fetchJson(buildZohoJobsApiUrl(), { signal })).map((job) => ({
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
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
