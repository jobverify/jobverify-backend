import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'
import { GET_MY_UNI_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = GET_MY_UNI_CATALOG.source
export const COMPANY = GET_MY_UNI_CATALOG.companyName
export const PROVIDER_METADATA = GET_MY_UNI_CATALOG
export const HOMEPAGE_URL = GET_MY_UNI_CATALOG.officialHomepageUrl
export const CONTACT_US_URL = GET_MY_UNI_CATALOG.contactUsUrl
export const CAREERS_INFO_URL = GET_MY_UNI_CATALOG.informationalCareersUrl

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob listings\b/i,
  /\bsearch jobs\b/i,
  /\bapply now\b/i,
  /\bview all positions\b/i,
  /\bjoin our team\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /freshteam/i,
  /zohorecruit/i,
  /darwinbox/i,
  /peoplestrong/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Getmyuni\s*-\s*Discover Colleges, Courses, Exams, and More\s*<\/title>/i.test(rawHtml)
    && /\bGetmyuni\b/i.test(normalized)
    && /Discover Colleges,\s*Courses,\s*Exams,\s*and More/i.test(normalized)
}

export const hasContactUsWorkWithUsSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Contact Us\s*\|\s*Getmyuni\s*<\/title>/i.test(rawHtml)
    && /\bGet in Touch\b/i.test(normalized)
    && /Want to work with us\?\s*contact@getmyuni\.com/i.test(normalized)
}

export const hasInformationalCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title>\s*Careers\s*\|\s*Getmyuni\s*<\/title>/i.test(rawHtml)
    && /\bCareers\b/i.test(normalized)
    && /(Explore careers after|career options|education planning)/i.test(normalized)
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createGetMyUniScraper = () => ({
  async run({
    fetchText = defaultFetchText,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml) || hasPublicJobsSignal(homepageHtml)) {
      throw new Error('GetMyUni verified GetMyUni homepage no longer matches the known first-party brand surface')
    }

    const contactUsHtml = await fetchText(CONTACT_US_URL)
    if (!hasContactUsWorkWithUsSignal(contactUsHtml) || hasPublicJobsSignal(contactUsHtml)) {
      throw new Error('GetMyUni contact-us page no longer matches the verified work-with-us surface')
    }

    const careersInfoHtml = await fetchText(CAREERS_INFO_URL)
    if (!hasInformationalCareersSignal(careersInfoHtml) || hasPublicJobsSignal(careersInfoHtml)) {
      throw new Error('GetMyUni informational careers route no longer matches the verified no-public-jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createGetMyUniScraper().run(options)

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
