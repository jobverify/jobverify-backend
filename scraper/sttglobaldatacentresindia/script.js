import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'sttglobaldatacentresindia'
export const COMPANY = 'STT Global Data Centres India Private Limited'
export const HOMEPAGE_URL = 'https://www.sttelemediagdc.com/in-en'
export const ABOUT_URL = 'https://www.sttelemediagdc.com/in-en/about-us/the-company'
export const CAREERS_URL = 'https://www.sttelemediagdc.com/in-en/about-us/careers'
export const CONTACT_URL = 'https://www.sttelemediagdc.com/contact'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_LISTING_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bview details\b/i,
  /\bapply now\b/i,
  /href=["'][^"']*\/jobs?\/[^"']+["']/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
]

const EMAIL_PATTERN = /\b([a-z0-9._%+-]+@sttelemediagdc\.in)\b/i

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\u00a0/g, ' ')
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

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('Contact')
    && normalized.includes('Careers')
    && normalized.includes("STT GDC India Inaugurates Rajasthan's First AI-Ready Data Centre")
    && normalized.includes('At the Core of Highly secure')
    && normalized.includes('Accelerate the growth of your business')
    && normalized.includes('10 Data centres in India')
}

export const hasOfficialAboutSignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('The foundation of a smarter, more sustainable digital future')
    && normalized.includes("As one of the world's fastest-growing data centre providers")
    && normalized.includes('power a sustainable digital future')
    && normalized.includes('offer scalable and secure, world-class data centre solutions and services')
    && normalized.includes('STT GDC commenced operations')
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('Shape a better digital world')
    && normalized.includes('If you are looking to grow your career while shaping a better digital world, we want to hear from you.')
    && normalized.includes('For job enquiries and applications, please write to us below.')
    && normalized.includes('STT Global Data Centres India Private Limited')
    && normalized.includes('contact@sttelemediagdc.in')
}

export const hasOfficialContactSignal = (html) => {
  const normalized = normalizeText(html)

  return normalized.includes('Contact Us')
    && normalized.includes('Let us know how we can help you')
    && normalized.includes('How Can We Help You?')
    && normalized.includes('ST Telemedia Global Data Centres')
}

export const extractEmailApplyHandoff = (html) => {
  const match = decodeHtmlEntities(String(html ?? '')).match(EMAIL_PATTERN)
  return match?.[1]?.toLowerCase() || null
}

export const hasPublicJobListingSignal = (html) =>
  PUBLIC_JOB_LISTING_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createSttGlobalDataCentresIndiaScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('STT verified India homepage no longer matches the trusted first-party surface')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasOfficialAboutSignal(aboutHtml)) {
      throw new Error('STT verified about page no longer matches the trusted first-party surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('STT verified careers page no longer matches the trusted first-party surface')
    }

    if (!extractEmailApplyHandoff(careersHtml)) {
      throw new Error('STT careers page no longer exposes the verified email-only application handoff')
    }

    if (hasPublicJobListingSignal(careersHtml)) {
      throw new Error('STT careers page now appears to expose public job records')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('STT verified contact page no longer matches the trusted first-party surface')
    }

    return []
  },
})

export const run = async (options = {}) => createSttGlobalDataCentresIndiaScraper().run(options)

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
