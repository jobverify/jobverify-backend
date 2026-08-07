import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'walkaroo'
export const COMPANY = 'Walkaroo'
export const HOMEPAGE_URL = 'https://www.walkaroo.in/'
export const ABOUT_URL = 'https://www.walkaroo.in/pages/about-us'
export const CONTACT_URL = 'https://www.walkaroo.in/pages/contact-us'
export const CAREERS_URL = 'https://recruitcareers.zappyhire.com/en/walkaroo'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#8217;/gi, "'")
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
  const normalized = normalizeWhitespace(html)
  const page = String(html ?? '')

  return normalized.includes('Walkaroo Footwear')
    && normalized.includes('Homegrown Indian Brand')
    && /Free shipping above/i.test(normalized)
    && (
      /https:\/\/www\.walkaroo\.in\/pages\/about-us/i.test(page)
      || /href=["']\/pages\/about-us["']/i.test(page)
    )
    && (
      /https:\/\/www\.walkaroo\.in\/pages\/contact-us/i.test(page)
      || /href=["']\/pages\/contact-us["']/i.test(page)
    )
}

export const hasAboutPageSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return /About us/i.test(normalized)
    && normalized.includes('Walkaroo: The SOLE and SOUL of young India')
    && normalized.includes('walking is the simplest solution to staying active and healthy')
    && /https:\/\/recruitcareers\.zappyhire\.com\/en\/walkaroo/i.test(String(html ?? ''))
}

export const hasContactPageSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return /Contact Us/i.test(normalized)
    && normalized.includes('Walkaroo International Pvt Ltd.')
    && normalized.includes('customercare@walkaroo.in')
    && normalized.includes('CIN : U19200TZ2011PTC029228')
    && /https:\/\/recruitcareers\.zappyhire\.com\/en\/walkaroo/i.test(String(html ?? ''))
}

export const hasOfficialCareersHandoffSignal = (html) => {
  const normalized = normalizeWhitespace(html)
  const compact = normalized.toLowerCase()

  return /<title>\s*Careers\s*<\/title>/i.test(String(html ?? ''))
    && (
      /^careers(?:\s+careers)?$/i.test(compact)
      || (
        /\bcareers\b/i.test(normalized)
        && /\bwalkaroo\b/i.test(normalized)
        && /Powered by Zappyhire/i.test(normalized)
      )
    )
}

const validateNoPublicListings = (jobs) => {
  if (!Array.isArray(jobs) || jobs.length !== 0) {
    throw new Error('Walkaroo scraper expected no direct public listings from the verified careers handoff')
  }

  return jobs
}

export const createWalkarooScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Walkaroo homepage no longer matches the verified official site')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasAboutPageSignal(aboutHtml)) {
      throw new Error('Walkaroo about page no longer matches the verified careers handoff')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasContactPageSignal(contactHtml)) {
      throw new Error('Walkaroo contact page no longer matches the verified official surface')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersHandoffSignal(careersHtml)) {
      throw new Error('Walkaroo careers handoff no longer matches the verified official Zappyhire surface')
    }

    return validateNoPublicListings([])
  },
})

export const run = async (options = {}) => createWalkarooScraper().run(options)

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
