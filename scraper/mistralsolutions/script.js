import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { MISTRAL_SOLUTIONS_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
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

const toCity = (locationText) => normalizeWhitespace(String(locationText ?? '').split(',')[0]) || null

export const hasOfficialCareersPageSignal = (html = '') => {
  const page = String(html ?? '')
  return /Careers Job Listings - Mistral Solutions/i.test(page)
    && /class=["']career-table["']/i.test(page)
    && /JID-\d+/i.test(page)
    && /View Details/i.test(page)
    && (
      /data-form=/i.test(page)
      || /docs\.google\.com\/forms/i.test(page)
      || /class=["'][^"']*apply-btn[^"']*["']/i.test(page)
    )
}

export const extractJobsFromHtml = (html = '') => {
  const jobs = []
  const rowPattern = /<tr>\s*<td>JID-[^<]+<\/td>[\s\S]*?<\/tr>/gi

  for (const rowMatch of html.matchAll(rowPattern)) {
    const rowHtml = rowMatch[0]
    const cells = [...rowHtml.matchAll(/<td>([\s\S]*?)<\/td>/gi)].map((match) => match[1])
    if (cells.length < 7) {
      continue
    }

    const jobId = normalizeWhitespace(cells[0])
    const title = normalizeWhitespace(cells[1])
    const experienceRequired = normalizeWhitespace(cells[2]) || null
    const rawLocation = normalizeWhitespace(cells[3])
    const jobDescription = normalizeWhitespace(cells[4]) || null
    const sourceUrl = normalizeWhitespace(cells[5].match(/<a[^>]+href="([^"]+)"/i)?.[1] ?? null)
    const applyUrl = normalizeWhitespace(
      cells[6].match(/data-form="([^"]+)"/i)?.[1]
        ?? cells[6].match(/<a[^>]+href="([^"]+)"/i)?.[1]
        ?? null,
    )
    const city = toCity(rawLocation)

    if (!jobId || !title || !rawLocation || !sourceUrl || !applyUrl || applyUrl === '#') {
      continue
    }

    jobs.push({
      title,
      company: COMPANY,
      department: null,
      location: rawLocation.endsWith('India') ? rawLocation : `${rawLocation}, India`,
      city,
      country: 'India',
      jobId,
      requisitionId: jobId,
      sourceUrl: new URL(sourceUrl, CAREERS_URL).toString(),
      applyUrl: new URL(applyUrl, CAREERS_URL).toString(),
      employmentType: null,
      experienceRequired,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription,
    })
  }

  return jobs
}

export const createMistralSolutionsScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersPageSignal(careersHtml)) {
      throw new Error('Mistral Solutions verified first-party careers table changed materially')
    }

    const jobs = extractJobsFromHtml(careersHtml)
    if (!jobs.length) {
      throw new Error('Mistral Solutions verified first-party careers table changed materially')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
    }))
  },
})

export const run = async (options = {}) => createMistralSolutionsScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const jobs = await run()

  if (process.argv.includes('--dry-run')) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
