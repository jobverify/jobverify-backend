import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { HIDDEN_BRAINS_INFOTECH_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = HIDDEN_BRAINS_INFOTECH_CATALOG.source
export const COMPANY = HIDDEN_BRAINS_INFOTECH_CATALOG.companyName
export const CAREERS_URL = HIDDEN_BRAINS_INFOTECH_CATALOG.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/\s+/g, ' ')
  .trim()

const normalizeText = (value) => normalizeWhitespace(value) || null

const stripTags = (value) => normalizeWhitespace(String(value ?? '').replace(/<[^>]+>/g, ' '))

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const parseInteger = (value) => {
  const match = String(value ?? '').match(/\d+/)
  return match ? Number.parseInt(match[0], 10) : null
}

const isIndiaScopedTitle = (title) => !/\babu dhabi\b/i.test(title)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /ALL POSITIONS/i.test(page)
    && /Join a People-first Environment/i.test(page)
    && /APPLY NOW!/i.test(page)
    && /#InquiryJob/i.test(page)
}

export const extractVisibleJobCards = (html = '') => [...String(html ?? '').matchAll(
  /JobPostView_inner-title__e9SXi">([\s\S]*?)<span[\s\S]*?JobPostView_openings-text__sLvQK">([\s\S]*?)<\/span>[\s\S]*?<ul>([\s\S]*?)<\/ul>[\s\S]*?<a href="#InquiryJob" class="JobPostView_apply-now-btn___CGti">APPLY NOW!<\/a>/gi,
)].map((match) => {
  const title = stripTags(match[1])
  const listItems = [...String(match[3]).matchAll(/<li>([\s\S]*?)<\/li>/gi)]
    .map((itemMatch) => stripTags(itemMatch[1]))
    .filter(Boolean)

  return {
    title,
    openingsCount: parseInteger(match[2]),
    experienceRequired: normalizeText(listItems[0]?.replace(/\s*Experience$/i, '')),
    employmentType: normalizeText(listItems[1]),
    applyUrl: `${CAREERS_URL}#InquiryJob`,
  }
}).filter((job) => job.title)

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createHiddenBrainsInfotechScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('The verified Hidden Brains careers page no longer matches the trusted first-party surface')
    }

    const jobs = extractVisibleJobCards(careersHtml)
      .filter((job) => isIndiaScopedTitle(job.title))

    if (jobs.length === 0) {
      throw new Error('Hidden Brains careers page no longer exposes the visible ALL POSITIONS cards')
    }

    return jobs
      .sort((left, right) => left.title.localeCompare(right.title) || left.applyUrl.localeCompare(right.applyUrl))
      .map((job) => ({
        ...job,
        jobId: `${SOURCE}-${slugify(job.title)}`,
        requisitionId: slugify(job.title),
        sourceUrl: CAREERS_URL,
        location: null,
        city: null,
        workplaceType: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        compensation: null,
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        companyCareerPage: CAREERS_URL,
        company: COMPANY,
        source: SOURCE,
        companyDomain: HIDDEN_BRAINS_INFOTECH_CATALOG.companyDomain,
        atsPlatform: HIDDEN_BRAINS_INFOTECH_CATALOG.atsPlatform,
        country: 'India',
        link: job.applyUrl,
        scrapedAt: (overrideNow || now)(),
      }))
  },
})

export const run = async (options = {}) => createHiddenBrainsInfotechScraper().run(options)

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
