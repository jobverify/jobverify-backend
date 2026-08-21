import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OUR_DATA_TEAM_URL = 'https://www.globalorizon.com/our-data-team-com'
export const OUR_HIRING_PARTNER_URL = 'https://www.globalorizon.com/the-hiring-partner-com'
export const PUBLIC_ORGANIZATION_URL =
  'https://api.thehiringpartner.com/public/organizations/by-slug/global-orizon-9ma3d'
export const SOURCE = 'globalorizon'
export const COMPANY = 'Global Orizon'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const normalizeDomain = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    return null
  }
}

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const makeAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/['’]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const pageIncludesAll = (html, patterns) => {
  const page = String(html ?? '')
  return patterns.every((pattern) => pattern.test(page))
}

export const hasOfficialOurDataTeamSignal = (html) =>
  pageIncludesAll(html, [
    /Global Orizon/i,
    /Data Engineering Perfected/i,
    /OurDataTeam|Our Data Team/i,
  ])

export const hasOfficialHiringPartnerSignal = (html) =>
  pageIncludesAll(html, [
    /Global Orizon/i,
    /Join Our Team/i,
    /Data Engineers/i,
    /thehiringpartner\.com/i,
  ])

export const extractHiringPartnerJobs = (
  html,
  {
    scrapedAt = new Date().toISOString(),
  } = {},
) => {
  const jobs = []

  for (const match of String(html ?? '').matchAll(
    /<h3[^>]*>\s*(?:<span[^>]*>)?([^<]+?)(?:<\/span>)?\s*<\/h3>[\s\S]{0,1200}?<p[^>]*>\s*(?:<span[^>]*>)?\s*India\s*(?:<\/span>)?\s*<\/p>[\s\S]{0,1200}?<a[^>]+href=["']([^"']*thehiringpartner\.com\/?[^"']*)["'][^>]*>/gi,
  )) {
    const title = normalizeWhitespace(match[1])
    const applyUrl = makeAbsoluteUrl(match[2], OUR_HIRING_PARTNER_URL)
    if (!title || !applyUrl) continue

    const jobId = `${SOURCE}-${slugify(title)}`
    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      link: OUR_HIRING_PARTNER_URL,
      applyUrl,
      sourceUrl: OUR_HIRING_PARTNER_URL,
      source: SOURCE,
      jobId,
      requisitionId: jobId,
      employmentType: null,
      experienceRequired: null,
      jobDescription: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      remoteStatus: null,
      scrapedAt,
    })
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

export const createGlobalOrizonScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const ourDataTeamHtml = await fetchText(OUR_DATA_TEAM_URL)
    if (!hasOfficialOurDataTeamSignal(ourDataTeamHtml)) {
      throw new Error('Global Orizon Our Data Team surface changed; refusing to assume zero public jobs')
    }

    const hiringPartnerHtml = await fetchText(OUR_HIRING_PARTNER_URL)
    if (!hasOfficialHiringPartnerSignal(hiringPartnerHtml)) {
      throw new Error('Global Orizon Hiring Partner surface changed; refusing to assume zero public jobs')
    }

    const jobs = extractHiringPartnerJobs(hiringPartnerHtml, {
      scrapedAt: now(),
    }).map((job) => ({
      ...job,
      companyCareerPage: OUR_HIRING_PARTNER_URL,
      companyDomain: normalizeDomain(OUR_DATA_TEAM_URL),
      atsPlatform: 'official-company-careers',
    }))

    if (jobs.length === 0) {
      throw new Error('Global Orizon hiring partner page no longer exposes parseable public roles')
    }

    return jobs
  },
})

export const run = async (options = {}) => createGlobalOrizonScraper().run(options)

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
