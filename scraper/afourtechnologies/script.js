import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { AFOUR_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const absolutizeUrl = (value) => new URL(value, CAREERS_URL).toString()

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Unlock Your Career Potential With AFour Technologies')
    && normalized.includes('We are hiring')
    && normalized.includes('Cobol Developer')
    && normalized.includes('Sr. Python Developer')
    && normalized.includes('Apply Now')
  }

export const extractJobs = (html = '') => {
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('AFour Technologies careers page no longer matches the verified AFour Technologies careers surface')
  }

  const jobs = [...String(html ?? '').matchAll(
    /<section[^>]*class="job-card"[^>]*>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<h2>([\s\S]*?)<\/h2>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<a[^>]+href="([^"]+)"[^>]*>\s*Apply Now\s*<\/a>[\s\S]*?<\/section>/gi,
  )].map((match) => ({
    title: normalizeWhitespace(match[1]),
    experience: normalizeWhitespace(match[2]),
    description: normalizeWhitespace(match[3]),
    location: 'India',
    sourceUrl: CAREERS_URL,
    applyUrl: absolutizeUrl(match[4]),
  })).filter((job) => job.title && job.experience && job.description && job.applyUrl)

  if (jobs.length === 0) {
    throw new Error('AFour Technologies verified job cards changed or disappeared')
  }

  return jobs
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createAFourTechnologiesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const html = await fetchText(CAREERS_URL)

    return extractJobs(html).map((job) => {
      const jobId = `${SOURCE}-${slugify(`${job.title}-${job.experience}`)}`

      return {
        ...job,
        company: COMPANY,
        department: null,
        country: 'India',
        city: null,
        jobId,
        requisitionId: jobId,
        employmentType: null,
        experienceRequired: job.experience,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: job.description,
        source: SOURCE,
        link: job.applyUrl,
        scrapedAt: new Date().toISOString(),
      }
    })
  },
})

export const run = async (options = {}) => createAFourTechnologiesScraper().run(options)

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
