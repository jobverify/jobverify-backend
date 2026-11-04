import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'
import { enrichRoleDescriptions } from '../../scraper-support/utils/enrichRoleDescriptions.js'

import { TUDIP_TECHNOLOGIES_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&hellip;/gi, '...')

const stripTags = (value) => String(value ?? '')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')

const normalizeWhitespace = (value) => decodeHtmlEntities(stripTags(value))
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, CAREERS_URL).toString()
  } catch {
    return CAREERS_URL
  }
}

const getSlugFromUrl = (value) => {
  try {
    const segments = new URL(value).pathname.split('/').filter(Boolean)
    return segments.at(-1) || SOURCE
  } catch {
    return SOURCE
  }
}

export const hasOfficialJobsSignal = (html = '') => {
  const page = String(html ?? '')

  return /Current Job Openings at Tudip \| Explore Your Career/i.test(page)
    && /https:\/\/tudip\.com\/jobs\//i.test(page)
    && /class="category-btn active"[^>]*data-category="india-en"/i.test(page)
}

export const extractJobCards = (html = '') => [...String(html ?? '').matchAll(
  /<li class="job_listing"([\s\S]*?)<\/li>/gi,
)]
  .map((match) => {
    const block = match[0]
    const category = normalizeText(block.match(/data-category="([^"]+)"/i)?.[1])
    if (category !== 'india-en') return null

    const href = toAbsoluteUrl(block.match(/class="apply-btn"[^>]*href="([^"]+)"/i)?.[1])
    const title = normalizeText(block.match(/<h3>([\s\S]*?)<\/h3>/i)?.[1])
      || normalizeText(block.match(/data-title="([^"]+)"/i)?.[1])
    const slug = getSlugFromUrl(href)

    if (!title || !href || !slug) return null
    const roleUrl = new URL(href)
    if (roleUrl.protocol !== 'https:' || roleUrl.hostname !== 'tudip.com' || roleUrl.username || roleUrl.password
      || roleUrl.search || roleUrl.hash || !/^\/jobs?\/india\/[a-z0-9-]+\/?$/i.test(roleUrl.pathname)) {
      throw new Error('Tudip India card no longer matches the trusted role identity')
    }

    return {
      title,
      company: COMPANY,
      department: null,
      location: 'India',
      city: null,
      country: 'India',
      jobId: `${SOURCE}-${slug}`,
      requisitionId: slug,
      sourceUrl: href,
      applyUrl: href,
      employmentType: null,
      workplaceType: null,
      experienceRequired: null,
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills: [],
      postingDate: null,
      closingDate: null,
      jobDescription: null,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url, { signal, includeResponseMetadata = false } = {}) => fetchTextWithRetry(url, {
  signal,
  includeResponseMetadata,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createTudipTechnologiesScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow, signal } = {}) {
    signal?.throwIfAborted()
    const careersResponse = await fetchText(CAREERS_URL, { signal })
    signal?.throwIfAborted()
    const careersHtml = typeof careersResponse === 'object' ? careersResponse?.html : careersResponse
    if (!hasOfficialJobsSignal(careersHtml)) {
      throw new Error('Tudip Technologies verified jobs page no longer matches the trusted first-party surface')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Tudip Technologies jobs page no longer exposes the verified India job listings')
    }

    return enrichRoleDescriptions(jobs.map((job) => ({
      ...job,
      source: SOURCE,
      company: COMPANY,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
    })), { fetchText, signal })
  },
})

export const run = async (options = {}) => createTudipTechnologiesScraper().run(options)

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
