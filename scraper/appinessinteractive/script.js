import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { APPINESS_INTERACTIVE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = APPINESS_INTERACTIVE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page)

  return /Jobs at Appiness Interactive/i.test(page)
    && text.includes('Current Openings')
    && text.includes('Role SEO Expert')
    && text.includes('Role Senior Software Engineer - Java')
}

export const extractJobs = (html = '') => {
  const matches = [...String(html ?? '').matchAll(
    /Role\s+([^<\n]+?)\s*<\/div>\s*<div>\s*Experience\s+([^<\n]+?)\s*<\/div>\s*<div>\s*Location\s+([^<\n]+?)\s*<\/div>/gi,
  )]

  return matches.map((match) => {
    const title = normalizeWhitespace(match[1])
    const experienceRequired = normalizeWhitespace(match[2])
    const city = normalizeWhitespace(match[3])
    const jobId = slugify(title)

    return {
      title,
      company: COMPANY,
      department: null,
      location: `${city}, India`,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: CAREERS_URL,
      applyUrl: CAREERS_URL,
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: 'On-site',
    }
  })
}

export const createAppinessInteractiveScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Verified Appiness Interactive careers surface changed')
    }

    const jobs = extractJobs(careersHtml).map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: new Date().toISOString(),
    }))

    return maxJobs ? jobs.slice(0, maxJobs) : jobs
  },
})

export const run = async (options = {}) => createAppinessInteractiveScraper(options).run(options)

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
