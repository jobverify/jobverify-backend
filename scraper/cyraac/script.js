import path from 'path'
import { fileURLToPath } from 'url'

import { loadConfig } from '../../scraper-support/utils/loadConfig.js'
import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const config = loadConfig(currentDir)

export const CAREERS_PAGE_URL = 'https://cyraacs.com/careers/'
export const APPLY_URL = 'https://forms.jumpp.tech/'

const normalizeText = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim() || null

const toAbsoluteUrl = (value) => new URL(value, CAREERS_PAGE_URL).toString()

const getJobId = (url) => new URL(url).pathname
  .split('/')
  .filter(Boolean)
  .at(-1) || null

const extractExperience = (value) => normalizeText(value)
  ?.match(/Experience:\s*(.*?)(?=\s+Location:|$)/i)?.[1]?.trim() || null

export const extractJobCards = (html) => {
  const jobs = []
  const pageHtml = String(html ?? '')
  const jobLinkPattern = /<a[^>]+href=["']([^"']+)["'][^>]*>(?:(?!<a\b)[\s\S])*?VIEW JOB DETAIL(?:(?!<a\b)[\s\S])*?<\/a>/gi

  for (const match of pageHtml.matchAll(jobLinkPattern)) {
    const prefix = pageHtml.slice(0, match.index)
    const headings = [...prefix.matchAll(/<h[3-6][^>]*>([\s\S]*?)<\/h[3-6]>/gi)]
    const departments = [...prefix.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    const heading = headings.at(-1)
    const title = normalizeText(heading?.[1])
    const body = pageHtml.slice((heading?.index ?? match.index) + (heading?.[0]?.length ?? 0), match.index)
    const department = normalizeText(departments.at(-1)?.[1])
    const sourceUrl = toAbsoluteUrl(match[1])
    const jobId = getJobId(sourceUrl)
    const details = normalizeText(body)

    if (!title || !jobId || new URL(sourceUrl).pathname.replace(/\/$/, '') === '/careers') continue

    jobs.push({
      title,
      department,
      jobDescription: /Experience:/i.test(details || '') ? null : details,
      experienceRequired: extractExperience(body),
      location: 'Bengaluru, India',
      city: 'Bengaluru',
      sourceUrl,
      applyUrl: APPLY_URL,
      jobId,
      requisitionId: jobId,
    })
  }

  return [...new Map(jobs.map((job) => [job.sourceUrl, job])).values()]
}

export const extractJobDescription = (html) => {
  const main = String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] || html

  return normalizeText(main)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: 'cyraac',
  timeoutMs: 15000,
})

export const createCyraacScraper = ({
  maxJobs = Number.isInteger(config.maxJobs) ? config.maxJobs : null,
} = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const listings = extractJobCards(await fetchText(CAREERS_PAGE_URL))
    const selected = maxJobs ? listings.slice(0, maxJobs) : listings

    return Promise.all(selected.map(async (listing) => ({
      ...listing,
      company: 'CYRAAC Services Private Limited',
      country: 'India',
      employmentType: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: extractJobDescription(await fetchText(listing.sourceUrl)) || listing.jobDescription,
      source: 'cyraac',
      link: listing.applyUrl,
      scrapedAt: new Date().toISOString(),
    })))
  },
})

export const run = async () => createCyraacScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  else await saveToDB(jobs, 'cyraac')
}
