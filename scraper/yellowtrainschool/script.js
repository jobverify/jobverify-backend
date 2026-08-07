import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const SOURCE = 'yellowtrainschool'
export const COMPANY = 'Yellow Train School'
export const HOMEPAGE_URL = 'https://www.yellowtrainschool.com/'
export const ABOUT_URL = 'https://www.yellowtrainschool.com/about-yellow-train'
export const RECRUITMENT_URL = 'https://www.yellowtrainschool.com/recruitment'
export const CONTACT_URL = 'https://www.yellowtrainschool.com/contact-us'
export const APPLY_EMAIL = 'careers@yellowtrainschool.com'
export const OPENINGS_SENTENCE = 'We are looking for Kindergarten, Primary, Waldorf Art and Senior School Subject teachers of English Literature and Economics.'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const LOCATION = 'Coimbatore, Tamil Nadu, India'
const EXPERIENCE_REQUIRED = 'Minimum commitment of two years'
const APPLY_URL = `mailto:${APPLY_EMAIL}`
const ROLE_TITLES = [
  'Kindergarten Teacher',
  'Primary Teacher',
  'Waldorf Art Teacher',
  'Senior School Teacher - English Literature',
  'Senior School Teacher - Economics',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const slugify = (value) => normalizeWhitespace(value)
  ?.toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || null

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')

  return /<title>\s*Yellow Train(?: School)?\s*<\/title>/i.test(page)
    && /href=["']\/about-yellow-train["']/i.test(page)
    && /href=["']\/recruitment["']/i.test(page)
    && /href=["']\/contact-us["']/i.test(page)
}

export const hasOfficialAboutSignal = (html) => {
  const page = String(html ?? '')
  return /Yellow Train School/i.test(page)
    && /Coimbatore/i.test(page)
    && /Waldorf/i.test(page)
}

export const hasOfficialRecruitmentSignal = (html) => {
  const page = String(html ?? '')
  return page.includes(OPENINGS_SENTENCE)
    && /(?:minimum commitment of two years|commitment of minimum two years)/i.test(page)
    && new RegExp(APPLY_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(page)
}

export const hasOfficialContactSignal = (html) => {
  const page = String(html ?? '')
  return /Yellow Train School/i.test(page)
    && /Coimbatore/i.test(page)
    && new RegExp(APPLY_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(page)
}

export const extractTeachingRoles = (html) => {
  if (!hasOfficialRecruitmentSignal(html)) return []

  return ROLE_TITLES.map((title) => {
    const jobId = `${SOURCE}-${slugify(title)}`

    return {
      title,
      company: COMPANY,
      department: 'Teaching',
      location: LOCATION,
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: RECRUITMENT_URL,
      applyUrl: APPLY_URL,
      employmentType: null,
      experienceRequired: EXPERIENCE_REQUIRED,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: OPENINGS_SENTENCE,
      remoteStatus: 'On-site',
    }
  })
}

export const createYellowTrainSchoolScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = () => new Date().toISOString(),
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Response is not the verified official homepage for Yellow Train School')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasOfficialAboutSignal(aboutHtml)) {
      throw new Error('Response is not the verified about page for Yellow Train School')
    }

    const recruitmentHtml = await fetchText(RECRUITMENT_URL)
    if (!hasOfficialRecruitmentSignal(recruitmentHtml)) {
      throw new Error('Response is not the verified official recruitment page for Yellow Train School')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('Response is not the verified official contact page for Yellow Train School')
    }

    const jobs = extractTeachingRoles(recruitmentHtml)
    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createYellowTrainSchoolScraper().run(options)

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
