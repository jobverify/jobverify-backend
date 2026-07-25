import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'kumaraguruinstitutions'
export const COMPANY = 'Kumaraguru Institutions'
export const HOMEPAGE_URL = 'https://kumaraguru.edu.in/'
export const CAREERS_URL = 'https://careers.kumaraguru.edu.in/'
export const CURRENT_OPENINGS_URL = 'https://careers.kumaraguru.edu.in/current_openings.php'
export const ACADEMIC_RECRUITMENT_URL = 'https://careers.kumaraguru.edu.in/academic.php'
export const SUPPORT_RECRUITMENT_URL = 'https://careers.kumaraguru.edu.in/support.php'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LOCATION = 'Coimbatore, Tamil Nadu, India'
const CITY = 'Coimbatore'
const COUNTRY = 'India'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtml(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toSignalText = (html) => normalizeWhitespace(html).toLowerCase()

const cleanHeading = (value) => normalizeWhitespace(value).replace(/\s*:\s*$/, '')

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const ensureSentence = (value) => {
  const text = normalizeWhitespace(value)
  if (!text) return text
  return /[.!?]$/.test(text) ? text : `${text}.`
}

const createBaseJob = ({
  title,
  department,
  jobId,
  sourceUrl,
  applyUrl,
  jobDescription,
}) => ({
  title,
  company: COMPANY,
  department,
  location: LOCATION,
  city: CITY,
  country: COUNTRY,
  jobId,
  requisitionId: jobId,
  sourceUrl,
  applyUrl,
  employmentType: null,
  experienceRequired: null,
  minimumQualification: null,
  preferredQualification: null,
  requiredSkills: [],
  postingDate: null,
  closingDate: null,
  jobDescription,
  remoteStatus: 'On-site',
})

const extractSections = (html) =>
  [...String(html ?? '').matchAll(/<h5[^>]*>([\s\S]*?)<\/h5>\s*<ul[^>]*>([\s\S]*?)<\/ul>/gi)]
    .map((match) => {
      const title = cleanHeading(match[1])
      const description = [...String(match[2]).matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)]
        .map((item) => normalizeWhitespace(item[1]))
        .filter(Boolean)
        .join(' ')

      return {
        title,
        description,
      }
    })
    .filter((section) => section.title && section.description)

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return /<title>\s*Kumaraguru Institutions/i.test(page)
    && page.includes('https://kumaraguru.edu.in/')
    && page.includes('ki40.jpg')
    && page.includes('alt="Kumaraguru Institutions"')
    && text.includes('kumaraguru institutions - developed by kct')
}

export const hasCareersLandingSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return /<title>\s*Careers - Kumaraguru Institutions\s*<\/title>/i.test(page)
    && text.includes('careers @ kumaraguru')
    && text.includes('current openings')
    && /href="academic\.php"/i.test(page)
    && /href="support\.php"/i.test(page)
}

export const hasCurrentOpeningsSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)

  return text.includes('current openings')
    && text.includes('academic recruitment')
    && text.includes('support services recruitment')
    && /href="academic\.php"/i.test(page)
    && /href="support\.php"/i.test(page)
}

export const hasAcademicRecruitmentSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)
  const sections = extractSections(page)

  return text.includes('academic recruitment')
    && text.includes('faculty opportunities')
    && text.includes('research opportunities')
    && text.includes('adjunct / visiting faculty / professor of practice opportunities')
    && text.includes('academic - registration form')
    && sections.length >= 4
}

export const hasSupportRecruitmentSignal = (html) => {
  const page = String(html ?? '')
  const text = toSignalText(page)
  const sections = extractSections(page)

  return text.includes('support services recruitment')
    && text.includes('administration & institutional operations opportunities')
    && text.includes('technology & digital transformation opportunities')
    && text.includes('finance, hr & institutional services opportunities')
    && text.includes('support services - registration form')
    && sections.length >= 4
}

export const extractAcademicRecruitmentJobs = (html) => {
  if (!hasAcademicRecruitmentSignal(html)) {
    throw new Error('Kumaraguru Institutions verified academic recruitment page no longer matches the known public surface')
  }

  return extractSections(html).map(({ title, description }) => {
    const jobId = `${SOURCE}-academic-recruitment-${slugify(title)}`

    return createBaseJob({
      title,
      department: 'Academic Recruitment',
      jobId,
      sourceUrl: `${ACADEMIC_RECRUITMENT_URL}#${slugify(title)}`,
      applyUrl: ACADEMIC_RECRUITMENT_URL,
      jobDescription: `${ensureSentence(description)} Apply through the official Kumaraguru Institutions academic recruitment form.`,
    })
  })
}

export const extractSupportRecruitmentJobs = (html) => {
  if (!hasSupportRecruitmentSignal(html)) {
    throw new Error('Kumaraguru Institutions verified support recruitment page no longer matches the known public surface')
  }

  return extractSections(html).map(({ title, description }) => {
    const jobId = `${SOURCE}-support-services-recruitment-${slugify(title)}`

    return createBaseJob({
      title,
      department: 'Support Services Recruitment',
      jobId,
      sourceUrl: `${SUPPORT_RECRUITMENT_URL}#${slugify(title)}`,
      applyUrl: SUPPORT_RECRUITMENT_URL,
      jobDescription: `${ensureSentence(description)} Apply through the official Kumaraguru Institutions support services recruitment form.`,
    })
  })
}

const attachRunMetadata = (jobs, scrapedAt) =>
  jobs.map((job) => ({
    ...job,
    source: SOURCE,
    link: job.applyUrl || job.sourceUrl,
    scrapedAt,
    companyCareerPage: CURRENT_OPENINGS_URL,
    companyDomain: 'kumaraguru.edu.in',
    atsPlatform: 'official-company-careers',
  }))

export const createKumaraguruInstitutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Kumaraguru Institutions verified official homepage no longer matches the known public surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasCareersLandingSignal(careersHtml)) {
      throw new Error('Kumaraguru Institutions verified careers landing page no longer matches the known public surface')
    }

    const currentOpeningsHtml = await fetchText(CURRENT_OPENINGS_URL)
    if (!hasCurrentOpeningsSignal(currentOpeningsHtml)) {
      throw new Error('Kumaraguru Institutions verified current openings page no longer matches the known public surface')
    }

    const academicHtml = await fetchText(ACADEMIC_RECRUITMENT_URL)
    const supportHtml = await fetchText(SUPPORT_RECRUITMENT_URL)

    const jobs = [
      ...extractAcademicRecruitmentJobs(academicHtml),
      ...extractSupportRecruitmentJobs(supportHtml),
    ]

    if (jobs.length === 0) {
      throw new Error('Kumaraguru Institutions verified careers surfaces no longer expose public openings')
    }

    return attachRunMetadata(jobs, (overrideNow || now)())
  },
})

export const run = async (options = {}) => createKumaraguruInstitutionsScraper().run(options)

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
