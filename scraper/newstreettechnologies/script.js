import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'newstreettechnologies'
export const COMPANY = 'New Street Technologies'
export const HOMEPAGE_URL = 'https://newstreettech.com/'
export const CONTACT_URL = 'https://newstreettech.com/contact'
export const PUBLIC_JOB_ROUTE_URLS = [
  'https://newstreettech.com/careers',
  'https://newstreettech.com/careers/',
  'https://newstreettech.com/career',
  'https://newstreettech.com/career/',
  'https://newstreettech.com/jobs',
  'https://newstreettech.com/jobs/',
  'https://newstreettech.com/join-us',
  'https://newstreettech.com/join-us/',
  'https://newstreettech.com/work-with-us',
  'https://newstreettech.com/work-with-us/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_BODY_TEXT_SIGNALS = [
  'Leveraging blockchain, AI, and new age technologies to create Hi-tech Ecosystems for powerful re-imagination of your Products, Processes & Partnerships.',
  'Explore MiFiX.ai',
]

const CONTACT_BODY_TEXT_SIGNALS = [
  'New Street Technologies Pvt Ltd',
  'Bengaluru, Karnataka - 560017',
]

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bview jobs\b/i,
  /\bjob description\b/i,
  /\bapply now\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /zohorecruit/i,
]

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#x27;|\u2019/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*New Street Technologies Pvt Ltd\s*<\/title>/i.test(page)
    && /<meta[^>]+name=["']description["'][^>]+content=["']New Street Technologies leverages blockchain, AI, and new age technologies to create Hi-tech Ecosystems for powerful re-imagination of your Products, Processes &amp; Partnerships\.[^"']*["']/i.test(page)
    && HOMEPAGE_BODY_TEXT_SIGNALS.every((signal) => normalized.includes(signal))
    && /href=["']\/contact["']/i.test(page)
    && /https:\/\/www\.linkedin\.com\/company\/newstreettech/i.test(page)
    && /https:\/\/mifix\.ai\/?/i.test(page)
}

export const hasInlineHiringSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /href=["']mailto:hr@newstreettech\.com["']/i.test(page)
    && />\s*Hiring\s*</i.test(page)
    && normalized.includes('Get in Touch')
}

export const hasOfficialContactSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*Contact\s*[—-]\s*New Street Technologies\s*<\/title>/i.test(page)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Get in touch with New Street Technologies\. Our offices in Bengaluru and Dubai, plus social channels and a direct message form\.[^"']*["']/i.test(page)
    && CONTACT_BODY_TEXT_SIGNALS.every((signal) => normalized.includes(signal))
    && /href=["']mailto:hr@newstreettech\.com["']/i.test(page)
    && /href=["']mailto:info@newstreettech\.com["']/i.test(page)
  }

export const hasPublicJobsSignal = (html = '') =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createNewStreetTechnologiesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('New Street Technologies verified official homepage no longer matches the known public surface')
    }

    if (!hasInlineHiringSignal(homepage.html)) {
      throw new Error('New Street Technologies verified inline hiring surface no longer matches the trusted zero-job state')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('New Street Technologies homepage now appears to expose public openings')
    }

    const contactPage = await fetchPage(CONTACT_URL)
    if (contactPage.status !== 200 || !hasOfficialContactSignal(contactPage.html)) {
      throw new Error('New Street Technologies verified contact page no longer matches the trusted hiring contact surface')
    }

    if (hasPublicJobsSignal(contactPage.html)) {
      throw new Error('New Street Technologies contact page now appears to expose public openings')
    }

    for (const routeUrl of PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (routePage.status !== 404) {
        throw new Error(`New Street Technologies public jobs route ${routeUrl} no longer matches the verified 404 zero-job state`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createNewStreetTechnologiesScraper().run(options)

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
