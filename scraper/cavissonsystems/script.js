import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CAVISSON_SYSTEMS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const OPENINGS_URL = PROVIDER_METADATA.openingsPageUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#8211;|&ndash;|â€“/gi, '-')
  .replace(/&#8217;|&rsquo;/gi, "'")
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialCareersSignal = (html = '') => {
  const text = stripTags(html)
  return text.includes('Further your career')
    && text.includes('Open Positions in India')
    && text.includes('Cavisson is the place to boost your career')
}

export const extractArchiveJobs = (html = '') => {
  const matches = String(html ?? '').matchAll(
    /<article class="entry-box[\s\S]*?<a href="([^"]+)"><h1 class="entry-title">(.*?)<\/h1><\/a>[\s\S]*?<div class="jobs">([\s\S]*?)<\/div>[\s\S]*?<\/article>/gi,
  )

  return [...matches].map((match) => ({
    applyUrl: match[1],
    title: stripTags(match[2]).replace(/\s+/g, ' ').trim(),
    summary: stripTags(match[3]),
  }))
}

export const createCavissonSystemsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Cavisson careers page no longer matches the trusted first-party surface')
    }

    const openingsHtml = await fetchText(OPENINGS_URL)
    const jobs = extractArchiveJobs(openingsHtml)
    if (jobs.length === 0) {
      throw new Error('The verified Cavisson India openings archive no longer matches the trusted first-party surface')
    }

    return jobs.map((job) => {
      const jobId = slugify(job.title)
      return {
        title: job.title,
        company: COMPANY,
        department: null,
        location: 'India',
        city: null,
        country: 'India',
        sourceUrl: OPENINGS_URL,
        applyUrl: job.applyUrl,
        jobId,
        requisitionId: jobId,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: job.summary,
        remoteStatus: 'On-site',
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: now(),
        companyCareerPage: CAREERS_URL,
        companyDomain: PROVIDER_METADATA.companyDomain,
        atsPlatform: PROVIDER_METADATA.atsPlatform,
      }
    })
  },
})

export const run = async (options = {}) => createCavissonSystemsScraper(options).run(options)

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
