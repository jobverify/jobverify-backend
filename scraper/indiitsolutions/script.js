import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import INDI_IT_SOLUTIONS_CATALOG from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const PROVIDER_METADATA = INDI_IT_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY_NAME = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const OFFICIAL_CAREERS_URL = PROVIDER_METADATA.officialCareersPageUrl
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const VERIFIED_SURFACE_SUMMARY = PROVIDER_METADATA.verifiedSurfaceSummary

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const hasOfficialIndiItCareerSignals = (html = '') => {
  const page = String(html ?? '')

  return /Join Our Vibrant Team at Indi IT\./i.test(page)
    && /View Open Roles/i.test(page)
    && /Top Opportunities Right Now\./i.test(page)
    && /hr@indiit\.com/i.test(page)
}

export const extractOpportunityCards = (html = '') => {
  const roles = []

  for (const match of String(html ?? '').matchAll(/<article\b[^>]*class=["'][^"']*\bindi-role-card\b[^"']*["'][^>]*>([\s\S]*?)<\/article>/gi)) {
    const articleHtml = match[1]
    const title = normalizeWhitespace(articleHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1])
    const experienceRequired = normalizeWhitespace(articleHtml.match(/class=["'][^"']*\bexperience\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1])
    const vacancies = normalizeWhitespace(articleHtml.match(/class=["'][^"']*\bvacancies\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i)?.[1])
    const applyUrl = normalizeWhitespace(articleHtml.match(/<a[^>]*href=["']([^"']+)["']/i)?.[1])

    if (!title || !experienceRequired || !vacancies || !applyUrl) continue

    roles.push({
      title,
      location: 'India',
      city: null,
      country: 'India',
      experienceRequired,
      vacancies,
      applyUrl,
      sourceUrl: applyUrl,
      jobId: slugify(new URL(applyUrl).hash.slice(1) || title),
    })
  }

  return roles
}

export const createIndiItSolutionsScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(OFFICIAL_CAREERS_URL)

    if (!hasOfficialIndiItCareerSignals(careersHtml)) {
      throw new Error('INDI IT SOLUTIONS verified first-party career page no longer matches the verified public surface')
    }

    const roles = extractOpportunityCards(careersHtml)
    if (roles.length === 0) {
      throw new Error('INDI IT SOLUTIONS verified career page no longer exposes the opportunity cards')
    }

    return roles.map((role) => ({
      title: role.title,
      company: COMPANY_NAME,
      department: null,
      location: role.location,
      city: role.city,
      country: role.country,
      jobId: role.jobId,
      requisitionId: null,
      sourceUrl: role.sourceUrl,
      applyUrl: role.applyUrl,
      employmentType: null,
      experienceRequired: role.experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: role.vacancies,
      source: SOURCE,
      link: role.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createIndiItSolutionsScraper(options).run(options)

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
