import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")

const stripTags = (value) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialExtentiaCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = stripTags(page)

  return text.includes('Careers Opportunities')
    && text.includes('More Details')
    && page.includes('Page 2')
  }

const extractPaginationUrls = (html = '') => {
  const urls = new Set([CAREERS_URL])
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Page\s+\d+\s*<\/a>/gi)) {
    urls.add(new URL(match[1], CAREERS_URL).toString())
  }
  return [...urls]
}

export const extractRoleCards = (html = '', pageUrl = CAREERS_URL) =>
  [...String(html ?? '').matchAll(
    /<a[^>]+href=["']([^"']+)["'][^>]*>\s*([^<]+?)\s*<\/a>[\s\S]*?<li[^>]*>\s*([^<]+?)\s*<\/li>[\s\S]*?<li[^>]*>\s*([^<]+?)\s*<\/li>[\s\S]*?More Details/gi,
  )].map((match) => {
    const sourceUrl = new URL(match[1], pageUrl).toString()
    const title = stripTags(match[2])
    const location = stripTags(match[3])
    const employmentType = stripTags(match[4])

    return {
      title,
      location,
      employmentType,
      sourceUrl,
      applyUrl: sourceUrl,
      jobId: `${SOURCE}-${slugify(title)}-${slugify(location)}`,
    }
  }).filter((job) => job.title && job.location && job.employmentType && job.sourceUrl)

export const createExtentiaInformationTechnologyScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const firstPageHtml = await fetchText(CAREERS_URL)

    if (!hasOfficialExtentiaCareersSignal(firstPageHtml)) {
      throw new Error('Extentia Information Technology careers archive no longer matches the verified first-party surface')
    }

    const archiveUrls = extractPaginationUrls(firstPageHtml)
    const pages = await Promise.all(archiveUrls.map(async (url) => [url, await fetchText(url)]))
    const jobs = pages.flatMap(([url, html]) => extractRoleCards(html, url))

    if (!jobs.length) {
      throw new Error('Extentia Information Technology careers archive exposes no public role cards')
    }

    const uniqueJobs = [...new Map(jobs.map((job) => [job.jobId, job])).values()]

    return uniqueJobs.map((job) => ({
      title: job.title,
      company: COMPANY,
      department: null,
      location: job.location,
      city: job.location,
      state: null,
      country: 'India',
      jobId: job.jobId,
      requisitionId: null,
      sourceUrl: job.sourceUrl,
      applyUrl: job.applyUrl,
      employmentType: job.employmentType,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
      remoteStatus: null,
      source: SOURCE,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createExtentiaInformationTechnologyScraper(options).run(options)

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
