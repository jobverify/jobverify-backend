import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = provider
export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const CAREERS_URL = provider.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtml = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8217;|&#39;|&apos;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')

const normalizeWhitespace = (value) => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page) || ''

  return /<title>\s*Join Our Team\s*\|\s*SPEC INDIA\s*<\/title>/i.test(page)
    && text.includes('Current Opening')
    && text.includes('Apply Now')
}

export const extractCurrentOpenings = (html = '') => {
  const cards = String(html ?? '').match(/<div class="curent_op_bx[\s\S]*?<a[^>]*>\s*(?:Apply Now|Read More)\s*<\/a>[\s\S]*?<\/div>/gi) || []

  return cards.map((card) => {
    const title = normalizeWhitespace(card.match(/<h4>([\s\S]*?)<\/h4>/i)?.[1])
    const experienceRequired = normalizeWhitespace(card.match(/Experience:\s*<\/strong>\s*([^<]+)/i)?.[1])
    const skillsText = normalizeWhitespace(card.match(/Skills:\s*<\/strong>\s*([^<]+)/i)?.[1])
    const sourceUrl = normalizeWhitespace(card.match(/href=["'](https:\/\/www\.spec-india\.com\/current-opening\/[^"']+)["']/i)?.[1])

    return {
      title,
      sourceUrl,
      applyUrl: sourceUrl,
      experienceRequired,
      requiredSkills: skillsText ? skillsText.split(/\s*,\s*/).filter(Boolean) : [],
    }
  }).filter((job) => job.title && job.sourceUrl)
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const html = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(html)) {
    throw new Error('SPEC INDIA verified careers page no longer matches the trusted first-party surface')
  }

  return extractCurrentOpenings(html).map((job) => ({
    title: job.title,
    company: COMPANY,
    department: null,
    location: 'India',
    city: null,
    state: null,
    country: 'India',
    jobId: null,
    requisitionId: null,
    sourceUrl: job.sourceUrl,
    applyUrl: job.applyUrl,
    employmentType: null,
    experienceRequired: job.experienceRequired,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: job.requiredSkills,
    postingDate: null,
    closingDate: null,
    jobDescription: null,
    remoteStatus: null,
    source: SOURCE,
    companyCareerPage: CAREERS_URL,
    companyDomain: provider.companyDomain,
    atsPlatform: provider.atsPlatform,
    link: job.applyUrl,
    scrapedAt: new Date().toISOString(),
  }))
}

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
