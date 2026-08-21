import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import { THINKBRIDGE_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const JOB_CARD_MARKER = '<div role="listitem" class="c-jobitem w-dyn-item">'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/&quot;|&#34;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => decodeHtmlEntities(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
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

const slugify = (value) => normalizeWhitespace(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const extractCountry = (value) => normalizeText(value)

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')

  return /<title>\s*Job Search \| thinkbridge/i.test(page)
    && extractJobCards(page).length > 0
}

export const extractJobCards = (html = '') => {
  const jobs = []
  const segments = String(html ?? '').split(JOB_CARD_MARKER).slice(1)

  for (const segment of segments) {
    const countryValue = segment.match(/<div class="category-tag country">([\s\S]*?)<\/div>/i)?.[1]
    const departmentValue = segment.match(/<div class="category-tag static hide">([\s\S]*?)<\/div>/i)?.[1]
    const experienceValue = segment.match(/<div class="category-tag gray career hide">([\s\S]*?)<\/div>/i)?.[1]
    const titleValue = segment.match(/<h3 class="space-top-small">([\s\S]*?)<\/h3>/i)?.[1]
    const summaryValue = segment.match(/<div class="opacity-dark-text summary">([\s\S]*?)<\/div>/i)?.[1]
    const skillsValue = segment.match(/<div class="category-tag transparent">([\s\S]*?)<\/div>/i)?.[1]
    const hrefValue = segment.match(/<a[^>]+href="([^"]+)"/i)?.[1]
    const title = normalizeText(titleValue)
    const sourceUrl = toAbsoluteUrl(hrefValue)
    if (!title || !sourceUrl) continue

    const requisitionId = slugify(hrefValue)
    const country = extractCountry(countryValue)
    const requiredSkills = normalizeText(skillsValue)
      ? normalizeText(skillsValue).split(/\s*,\s*/).filter(Boolean)
      : []

    jobs.push({
      title,
      jobId: `${SOURCE}-${requisitionId}`,
      requisitionId,
      sourceUrl,
      applyUrl: sourceUrl,
      location: country,
      city: null,
      country,
      department: normalizeText(departmentValue),
      employmentType: null,
      workplaceType: null,
      experienceRequired: normalizeText(experienceValue),
      minimumQualification: null,
      preferredQualification: null,
      requiredSkills,
      compensation: null,
      postingDate: null,
      closingDate: null,
      openingsCount: null,
      jobDescription: normalizeText(summaryValue),
      companyCareerPage: CAREERS_URL,
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

export const createThinkbridgeScraper = ({ now = () => new Date().toISOString() } = {}) => ({
  async run({ fetchText = defaultFetchText, now: overrideNow } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('thinkbridge verified first-party job-search page changed materially')
    }

    const jobs = extractJobCards(careersHtml)
    if (jobs.length === 0) {
      throw new Error('thinkbridge verified first-party job-search page no longer exposes visible public role cards')
    }

    return jobs.map((job) => ({
      ...job,
      company: COMPANY,
      source: SOURCE,
      companyDomain: PROVIDER_METADATA.companyDomain,
      atsPlatform: PROVIDER_METADATA.atsPlatform,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: (overrideNow || now)(),
    }))
  },
})

export const run = async (options = {}) => createThinkbridgeScraper().run(options)

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
