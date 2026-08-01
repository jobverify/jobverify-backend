import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { CYBERTECH_SYSTEMS_AND_SOFTWARE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
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
  return normalized.includes('Search Jobs at CyberTech')
    && normalized.includes('Lead Public Cloud DevOps Automation Specialist')
    && normalized.includes('SAP ABAP Developer')
}

export const extractJobCards = (html = '') =>
  [...String(html ?? '').matchAll(
    /<h5>\s*<a href="([^"]+)"[^>]*>\s*([^<]+?)\s*<\/a>\s*<\/h5>[\s\S]*?<div class="jobmeta">[\s\S]*?<span>([^<]+)<\/span>[\s\S]*?<div class="jobmeta">[\s\S]*?<span>([^<]+)<\/span>/gi,
  )]
    .map(([, sourceUrl, title, experienceRequired, employmentType]) => ({
      title: normalizeWhitespace(title),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeWhitespace(employmentType),
      experienceRequired: normalizeWhitespace(experienceRequired),
    }))
    .filter((job) => job.title && job.sourceUrl)

export const createCybertechSystemsAndSoftwareScraper = ({
  maxJobs = null,
  now: defaultNow = () => new Date().toISOString(),
} = {}) => ({
  async run({
    fetchText = defaultFetchText,
    now = defaultNow,
  } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Cybertech Systems & Software careers card grid changed materially')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('The verified Cybertech Systems & Software careers grid no longer exposes public job cards')
    }

    const selectedJobs = Number.isInteger(maxJobs) ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => {
      const slug = slugify(job.sourceUrl.split('/').filter(Boolean).at(-1))

      return {
        ...job,
        company: COMPANY,
        department: null,
        location: null,
        city: null,
        state: null,
        country: null,
        jobId: slug,
        requisitionId: slug,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
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

export const run = async (options = {}) => createCybertechSystemsAndSoftwareScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
