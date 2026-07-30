import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'vivriticapital'
export const COMPANY = 'Vivriti Capital'
export const HOMEPAGE_URL = 'https://www.vivriticapital.com/'
export const CAREERS_URL = 'https://www.vivriticapital.com/work-with-us.html'
export const ABOUT_URL = 'https://www.vivriticapital.com/vivriti-group.html'
export const CONTACT_URL = 'https://www.vivriticapital.com/contact-us.html'
export const DARWINBOX_HANDOFF_URL = 'https://vivriti.darwinbox.in'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
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

export const extractOfficialDarwinboxUrl = (html = '') => {
  const match = String(html ?? '').match(/https:\/\/vivriti\.darwinbox\.in\b/i)
  return match ? normalizeWhitespace(match[0]) : null
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Financial services companies | Vivriti Capital')
    && normalized.includes('Vivriti Capital Limited')
    && normalized.includes('Public Notice')
    && normalized.includes('Careers All the hot jobs that are open at Vivriti Capital')
    && normalized.includes('sales@vivriticapital.com')
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Career | Vivriti Capital')
    && normalized.includes('People Are at the Heart of What We Do')
    && normalized.includes('Join Our Team')
    && normalized.includes('Discover roles across various departments')
    && normalized.includes('Use our filters to find opportunities')
}

export const hasOfficialAboutSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Vivriti Group | financial solutions')
    && normalized.includes('Vivriti Means Progress Vivriti Group Is All About Transformation')
    && normalized.includes('Vivriti Group is the pioneering Mid-Market Lender')
    && normalized.includes('Vivriti Capital, established in 2017, is a fintech NBFC')
}

export const hasOfficialContactSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Contact us | Vivriti Capital')
    && normalized.includes('Prestige Zackria Metropolitan, No.200/1-8, 2nd Floor, Block 1, Anna Salai, Chennai 600002')
    && normalized.includes('sales@vivriticapital.com')
    && normalized.includes('grievanceredressal@vivriticapital.com')
}

export const createVivritiCapitalScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!hasOfficialHomepageSignal(homepageHtml)) {
      throw new Error('Vivriti Capital homepage no longer matches the verified official site')
    }

    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersSignal(careersHtml)) {
      throw new Error('Vivriti Capital careers page no longer matches the verified official surface')
    }
    if (extractOfficialDarwinboxUrl(careersHtml) !== DARWINBOX_HANDOFF_URL) {
      throw new Error('Vivriti Capital Darwinbox handoff no longer matches the verified official surface')
    }

    const aboutHtml = await fetchText(ABOUT_URL)
    if (!hasOfficialAboutSignal(aboutHtml)) {
      throw new Error('Vivriti Capital about page no longer matches the verified official site')
    }

    const contactHtml = await fetchText(CONTACT_URL)
    if (!hasOfficialContactSignal(contactHtml)) {
      throw new Error('Vivriti Capital contact page no longer matches the verified official site')
    }

    return []
  },
})

export const run = async (options = {}) => createVivritiCapitalScraper().run(options)

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
