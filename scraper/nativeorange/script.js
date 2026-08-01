import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nativeorange'
export const COMPANY = 'Native orange'
export const HOMEPAGE_URL = 'https://nativeorange.ai/'
export const ABOUT_URL = 'https://nativeorange.ai/about/'
export const CONTACT_URL = 'https://nativeorange.ai/contact/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const FIRST_PARTY_JOB_PATH_PATTERN =
  /(?:^|\/)(careers?|jobs?|job|openings?|vacancies?|join-us|work-with-us)(?:\/|$)/i

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bjob description\b/i,
  /\bsearch jobs\b/i,
  /\bview jobs\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /recruitee/i,
  /breezy\.hr/i,
  /linkedin\.com\/jobs/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&lsquo;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const toAbsoluteUrl = (value) => {
  try {
    return new URL(value, HOMEPAGE_URL)
  } catch {
    return null
  }
}

const isFirstPartyUrl = (url) => {
  const hostname = String(url?.hostname ?? '').toLowerCase()
  return hostname === 'nativeorange.ai' || hostname.endsWith('.nativeorange.ai')
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
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

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Nativeorange')
    && normalized.includes('AI insurance products')
    && normalized.includes('sales@nativeorange.ai')
    && normalized.includes('San Francisco')
}

export const hasOfficialAboutSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('About Nativeorange')
    && normalized.includes('Join Our Team')
    && normalized.includes('actively looking for candidates')
    && normalized.includes('Apply Now')
}

export const hasOfficialContactSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Contact Us')
    && normalized.includes('sales@nativeorange.ai')
    && normalized.includes('San Francisco')
    && normalized.includes('Talk to our team')
}

export const hasFirstPartyJobsPathLink = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1])
    if (!absoluteUrl || !isFirstPartyUrl(absoluteUrl)) {
      continue
    }

    if (FIRST_PARTY_JOB_PATH_PATTERN.test(absoluteUrl.pathname)) {
      return true
    }
  }

  return false
}

export const extractApplyHandoffUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const [, href, text] = match
    const normalizedText = normalizeWhitespace(text).toLowerCase()
    if (!normalizedText.includes('apply now')) {
      continue
    }

    const absoluteUrl = toAbsoluteUrl(href)
    if (!absoluteUrl || !isFirstPartyUrl(absoluteUrl)) {
      continue
    }

    return absoluteUrl.toString()
  }

  return null
}

export const hasPublicJobsSignal = (html) =>
  hasFirstPartyJobsPathLink(html)
  || PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createNativeOrangeScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Native orange verified official homepage no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Native orange homepage now exposes public jobs')
    }

    const about = await fetchPage(ABOUT_URL)
    if (about.status !== 200 || !hasOfficialAboutSignal(about.html)) {
      throw new Error('Native orange verified about page no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(about.html)) {
      throw new Error('Native orange about page now exposes public jobs')
    }
    if (extractApplyHandoffUrl(about.html) !== CONTACT_URL) {
      throw new Error('Native orange about page no longer hands candidates to the verified contact surface')
    }

    const contact = await fetchPage(CONTACT_URL)
    if (contact.status !== 200 || !hasOfficialContactSignal(contact.html)) {
      throw new Error('Native orange verified contact page no longer matches the known public surface')
    }
    if (hasPublicJobsSignal(contact.html)) {
      throw new Error('Native orange contact page now exposes public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createNativeOrangeScraper().run(options)

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
