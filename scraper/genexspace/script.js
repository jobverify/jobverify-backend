import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'genexspace'
export const COMPANY = 'Genex Space'
export const HOMEPAGE_URL = 'https://genex.space/'
export const FELLOWSHIP_URL = 'https://genex.space/gsef/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOB_DESCRIPTION =
  'Join the Genex Space Explorers Fellowship for Indian nationals as a full-time two-year fellowship with a stipend and first-party resume-upload application.'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Genex Space/i.test(page)
    && /SpaceShaala/i.test(text)
    && /info@genex\.space/i.test(text)
    && /Bengaluru,\s*Karnataka,\s*India/i.test(text)
    && /href=["']https:\/\/genex\.space\/gsef\/["']/i.test(page)
}

export const hasOfficialFellowshipSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Genex Space Explorers Fellowship/i.test(text)
    && /Indian nationals/i.test(text)
    && /full-time Fellows/i.test(text)
    && /two-year commitment/i.test(text)
    && /stipend/i.test(text)
    && /<form\b/i.test(page)
    && /type=["']file["']/i.test(page)
    && /Apply Now/i.test(text)
}

export const extractPublicJobs = (html) => {
  if (!hasOfficialFellowshipSignal(html)) {
    throw new Error('Genex Space verified official fellowship page no longer matches the trusted public surface')
  }

  return [{
    title: 'Genex Space Explorers Fellowship',
    company: COMPANY,
    department: 'Fellowship',
    location: 'India',
    city: null,
    country: 'India',
    jobId: `${SOURCE}-${slugify('Genex Space Explorers Fellowship')}`,
    requisitionId: `${SOURCE}-gsef`,
    sourceUrl: FELLOWSHIP_URL,
    applyUrl: FELLOWSHIP_URL,
    employmentType: 'Full-time',
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: null,
    closingDate: null,
    jobDescription: JOB_DESCRIPTION,
    remoteStatus: null,
  }]
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

export const createGenexSpaceScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Genex Space verified official homepage no longer matches the trusted first-party surface')
    }

    const fellowshipHtml = await fetchText(FELLOWSHIP_URL)
    const jobs = extractPublicJobs(fellowshipHtml)

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createGenexSpaceScraper().run(options)

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
