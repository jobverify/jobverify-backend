import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'indienergy'
export const COMPANY = 'INDI ENERGY'
export const HOMEPAGE_URL = 'https://indienergy.in/'
export const CAREERS_URL = 'https://indienergy.in/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bjob description\b/i,
  /\bapply now\b/i,
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /workdayjobs/i,
  /myworkdayjobs/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractCareersUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    try {
      const absoluteUrl = new URL(match[1], HOMEPAGE_URL).toString()
      if (absoluteUrl === CAREERS_URL) {
        return absoluteUrl
      }
    } catch {
      // Ignore malformed href values from the page shell.
    }
  }

  return null
}

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Home\s*-\s*Indi Energy\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/indienergy\.in\/["']/i.test(rawHtml)
    && /"@type":\["Corporation","Organization"\]/.test(rawHtml)
    && /"name":"Indi Energy"/.test(rawHtml)
    && /Sodium ion batteries for Empowering Energy Independence/i.test(normalized)
    && /DRDO Dare to Dream 3\.0/i.test(normalized)
    && extractCareersUrl(rawHtml) === CAREERS_URL
}

export const hasApplyOnlyCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*Careers\s*-\s*Indi Energy\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/indienergy\.in\/careers\/["']/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Check out the career options at IndiEnergy["']/i.test(rawHtml)
    && /Apply today/i.test(normalized)
    && /class=["']wpcf7 no-js["']/i.test(rawHtml)
    && /aria-label=["']Contact form["']/i.test(rawHtml)
    && /Required fields are marked \(\*\)\./i.test(normalized)
    && /Your name \*/i.test(normalized)
    && /Your email \*/i.test(normalized)
    && /Subject \*/i.test(normalized)
    && /Your message \(optional\)/i.test(normalized)
    && /type=["']submit["'][^>]+value=["']Submit["']/i.test(rawHtml)
  }

export const hasPublicJobListingsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createIndiEnergyScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('INDI ENERGY verified official homepage no longer matches the known careers handoff')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (hasPublicJobListingsSignal(careersPage.html)) {
      throw new Error('INDI ENERGY careers page now appears to expose public job listings')
    }

    if (careersPage.status !== 200 || !hasApplyOnlyCareersSignal(careersPage.html)) {
      throw new Error('INDI ENERGY careers page no longer matches the verified apply-only careers shell')
    }

    return []
  },
})

export const run = async (options = {}) => createIndiEnergyScraper().run(options)

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
