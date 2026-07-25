import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { MUVI_ENTERTAINMENT_CATALOG as PROVIDER_METADATA } from './catalog.js'

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

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /Muvi - Build your Career with us! View current job openings at our various offices/i.test(page)
    && /Current Openings/i.test(page)
    && /career\/?/i.test(page)
}

export const extractJobCards = (html = '') => [...String(html ?? '').matchAll(
  /<div class="list-data">([\s\S]*?)<div class="clearfix"><\/div>/gi,
)]
  .map((match) => {
    const block = match[1]
    const href = toAbsoluteUrl(block.match(/href="([^"]+\/jobs\/[^"]+)"/i)?.[1])
    const title = normalizeText(block.match(/class="job-title">([\s\S]*?)<\/span>/i)?.[1])
    const city = normalizeText(block.match(/class="job-location"[^>]*>[\s\S]*?<\/i>\s*([^<]+)</i)?.[1])
    const slug = getSlugFromUrl(href)
    const description = normalizeText(
      block.match(/<div class="job-description">\s*<p>([\s\S]*?)<\/p>/i)?.[1],
    )

    if (!title || !slug || !href) return null

    return {
      title,
      company: COMPANY,
      department: null,
      location: city || 'India',
      city,
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
      jobDescription: description || title,
    }
  })
  .filter(Boolean)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createMuviEntertainmentScraper = ({
  now = () => new Date().toISOString(),
} = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Muvi Entertainment verified careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('Muvi Entertainment careers page no longer exposes the verified current openings links')
    }

    return jobs.map((job) => ({
      ...job,
      source: SOURCE,
      company: COMPANY,
      companyCareerPage: CAREERS_URL,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createMuviEntertainmentScraper().run(options)

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, SOURCE)
  }
}
