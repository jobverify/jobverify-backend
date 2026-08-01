import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { INUBE_SOFTWARE_SOLUTIONS_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = INUBE_SOFTWARE_SOLUTIONS_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
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

const parseListItems = (html) => [...String(html ?? '').matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*Careers\s*-\s*iNube\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('View all 0penings')
    && normalized.includes('Technical Lead PPS')
}

export const extractRoleSummaries = (html = '') =>
  [...String(html ?? '').matchAll(/<article[^>]*>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>\s*<span[^>]*>([^<]+)<\/span>\s*<\/article>/gi)]
    .map((match) => ({
      title: normalizeWhitespace(match[2]),
      detailUrl: normalizeWhitespace(match[1]),
      department: normalizeWhitespace(match[3]),
      employmentType: normalizeWhitespace(match[4]),
      location: normalizeWhitespace(match[5]),
    }))
    .filter((item) => item.title && item.detailUrl)

export const extractRoleDetail = (html = '', summary = {}) => {
  const location = normalizeWhitespace(String(html ?? '').match(/Location:\s*([^<\n]+)/i)?.[1])
  const experienceRequired = normalizeWhitespace(String(html ?? '').match(/(\d+\s*-\s*\d+\s*years?|\d+\s*-\s*\d+\s*years?\s+experience)/i)?.[1])
    ?.replace(/\s+experience$/i, '')

  return {
    title: summary.title,
    company: COMPANY,
    department: summary.department,
    location: location ? `${location}, India` : summary.location ? `${summary.location}, India` : null,
    city: location || summary.location || null,
    country: 'India',
    jobId: summary.detailUrl.split('/').filter(Boolean).at(-1),
    requisitionId: summary.detailUrl.split('/').filter(Boolean).at(-1),
    sourceUrl: summary.detailUrl,
    applyUrl: summary.detailUrl,
    employmentType: summary.employmentType,
    experienceRequired: experienceRequired || null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: parseListItems(html),
    postingDate: null,
    closingDate: null,
    jobDescription: normalizeWhitespace(String(html ?? '').match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]),
    remoteStatus: /Work from Office/i.test(String(html ?? '')) ? 'On-site' : null,
  }
}

export const createInubeSoftwareSolutionsScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Inube Software Solutions careers surface no longer matches the trusted first-party page')
    }

    const summaries = extractRoleSummaries(careersHtml)
    const selectedSummaries = maxJobs ? summaries.slice(0, maxJobs) : summaries
    const jobs = []

    for (const summary of selectedSummaries) {
      const detailHtml = await fetchText(summary.detailUrl)
      jobs.push({
        ...extractRoleDetail(detailHtml, summary),
        source: SOURCE,
        link: summary.detailUrl,
        scrapedAt: now(),
      })
    }

    return jobs
  },
})

export const run = async (options = {}) => createInubeSoftwareSolutionsScraper().run(options)

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
