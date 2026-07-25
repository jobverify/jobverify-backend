import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { D2K_TECHNOLOGIES_INDIA_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = D2K_TECHNOLOGIES_INDIA_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const toAbsoluteUrl = (value) => {
  try {
    const url = new URL(value, CAREERS_URL)
    if (url.hostname !== 'www.d2ktechnologies.com') return null
    return url.toString()
  } catch {
    return null
  }
}

const extractBullets = (html = '') => [...String(html ?? '').matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
  .map((match) => normalizeWhitespace(match[1]))
  .filter(Boolean)

const extractLastMatch = (input, pattern) => {
  let value = null
  for (const match of String(input ?? '').matchAll(pattern)) {
    value = normalizeWhitespace(match[1])
  }
  return value
}

const extractLastBulletsBlock = (input) => {
  let block = null
  for (const match of String(input ?? '').matchAll(/<ul[^>]*class="font_8 wixui-rich-text__text"[\s\S]*?<\/ul>/gi)) {
    block = match[0]
  }
  return block
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*Careers\s*\|\s*D2K Technologies\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('Why D2K?')
    && normalized.includes('Current Openings')
    && normalized.includes('D2K Technologies India Pvt. Ltd.')
}

export const extractJobCards = (html = '') => {
  const jobs = []
  const applyPattern = /<a[^>]*href="(https:\/\/www\.d2ktechnologies\.com\/[^"]+)"[^>]*aria-label="Apply Now"[^>]*>/gi

  for (const match of String(html ?? '').matchAll(applyPattern)) {
    const applyUrl = toAbsoluteUrl(match[1])
    if (!applyUrl) continue

    const snippet = String(html ?? '').slice(Math.max(0, match.index - 3000), match.index)
    const title = extractLastMatch(snippet, /letter-spacing:0\.05em;" class="wixui-rich-text__text">([^<]+)<\/span>/gi)
    const experience = extractLastMatch(snippet, /Experience:\s*([^<]+)/gi)
    const bullets = extractBullets(extractLastBulletsBlock(snippet) || '')

    if (!title || !experience) continue

    jobs.push({
      title,
      location: 'Navi Mumbai, Maharashtra, India',
      city: 'Navi Mumbai',
      country: 'India',
      sourceUrl: applyUrl,
      applyUrl,
      employmentType: 'Full Time',
      experienceRequired: experience,
      jobDescription: bullets.join(' '),
      requiredSkills: bullets,
    })
  }

  return jobs
}

export const createD2KScraper = () => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified D2K careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('The verified D2K careers page no longer exposes trusted first-party job cards')
    }

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      source: SOURCE,
      department: null,
      jobId: slugify(titleCaseKey(job.title)),
      requisitionId: slugify(titleCaseKey(job.title)),
      minimumQualification: null,
      preferredQualification: null,
      postingDate: null,
      closingDate: null,
      link: job.applyUrl,
      scrapedAt: now(),
    }))
  },
})

const titleCaseKey = (value) => normalizeWhitespace(value)

export const run = async (options = {}) => createD2KScraper().run(options)

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
