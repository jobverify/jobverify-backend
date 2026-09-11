import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { IPROGRAMMER_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = IPROGRAMMER_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (url.hostname !== 'iprogrammer.com') return null
    return url.toString()
  } catch {
    return null
  }
}

const detailPattern = /<div[^>]*class=["'][^"']*elementor-widget-wrap[^"']*["'][^>]*>[\s\S]*?<h4[^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h4>[\s\S]*?<p>([\s\S]*?)<\/p>[\s\S]*?<strong>\s*Experience\s*<\/strong>\s*:\s*([^<]+)<[\s\S]*?<strong>\s*Vacancies\s*<\/strong>\s*:\s*([^<]+)<[\s\S]*?<strong>\s*Job Location\s*<\/strong>\s*:\s*([^<]+)<[\s\S]*?<strong>\s*Work Mode\s*<\/strong>\s*:\s*([^<]+)</gi

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasVerifiedOpeningsSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  return /<title>\s*IT Companies in Pune for Freshers \| Experience\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('Current Openings')
    && normalized.includes('ta@iprogrammer.co')
    && normalized.includes('DevOps Engineer')
    && normalized.includes('Odoo QA Engineer')
    && normalized.includes('Lead NodeJS Engineer')
    && normalized.includes('ReactJS Developer')
}

const normalizeRemoteStatus = (value) => {
  const normalized = normalizeWhitespace(value)
  if (/hybrid/i.test(normalized)) return 'Hybrid'
  if (/remote/i.test(normalized)) return 'Remote'
  return 'On-site'
}

export const extractJobs = (html = '') => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(detailPattern)) {
    const [, href, rawTitle, rawDescription, rawExperience, rawVacancies, rawLocation, rawWorkMode] = match
    const title = normalizeWhitespace(rawTitle)
    const sourceUrl = toAbsoluteUrl(href)
    const location = normalizeWhitespace(rawLocation)

    if (!title || !sourceUrl || !location) continue

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: `${location}, India`,
      city: location,
      country: 'India',
      jobId: slugify(title),
      requisitionId: slugify(title),
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: null,
      experienceRequired: normalizeWhitespace(rawExperience),
      vacancies: normalizeWhitespace(rawVacancies),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: normalizeWhitespace(rawDescription),
      remoteStatus: normalizeRemoteStatus(rawWorkMode),
    })
  }

  return jobs
}

export const createIprogrammerSolutionsScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasVerifiedOpeningsSignal(careersHtml)) {
      throw new Error('The verified iProgrammer Solutions openings surface no longer matches the trusted first-party page')
    }

    const jobs = extractJobs(careersHtml)
    const selectedJobs = maxJobs ? jobs.slice(0, maxJobs) : jobs

    return selectedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export const run = async (options = {}) => createIprogrammerSolutionsScraper().run(options)

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
