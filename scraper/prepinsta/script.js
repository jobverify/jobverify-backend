import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'prepinsta'
export const COMPANY = 'PrepInsta'
export const CAREERS_URL = 'https://prepinsta.com/career-opportunities/'
export const START_CAREER_URL = 'https://angel.co/company/prepinsta'
export const PUBLIC_JOBS_URL = 'https://angel.co/company/prepinsta/jobs'
export const BLOCKED_PUBLIC_JOBS_FINAL_URL = 'https://wellfound.com/company/prepinsta/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERN =
  /open positions|job openings|current openings|apply now|software engineer|product manager|designer|marketing|data scientist|<a[^>]+href=["'][^"']*jobs?[^"']*["']/i

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

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
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

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(html)

  return /<title>\s*PrepInsta Career Opportunities\s*<\/title>/i.test(page)
    && normalized.includes('Join Our Team')
    && normalized.includes('Join us, on our journey to help upskill students and get them placed')
    && normalized.includes('All Open Positions')
}

const extractLinkByText = (html, textPattern) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const anchorText = normalizeWhitespace(match[2])
    if (!textPattern.test(anchorText)) {
      continue
    }

    try {
      return new URL(match[1], CAREERS_URL).toString()
    } catch {
      continue
    }
  }

  return null
}

export const extractStartCareerUrl = (html) =>
  extractLinkByText(html, /^Start Your Career With Us$/i)

export const extractPublicJobsUrl = (html) =>
  extractLinkByText(html, /^Click Here to Check$/i)

export const hasBlockedPublicJobsSignal = ({ status, url, html } = {}) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return status === 403
    && url === BLOCKED_PUBLIC_JOBS_FINAL_URL
    && normalized.includes('wellfound.com')
    && normalized.includes('please enable js and disable any ad blocker')
}

export const createPrepinstaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('PrepInsta careers page no longer matches the verified official careers surface')
    }

    const startCareerUrl = extractStartCareerUrl(careersPage.html)
    if (startCareerUrl !== START_CAREER_URL) {
      throw new Error('PrepInsta careers page no longer links to the verified startup profile handoff')
    }

    const publicJobsUrl = extractPublicJobsUrl(careersPage.html)
    if (publicJobsUrl !== PUBLIC_JOBS_URL) {
      throw new Error('PrepInsta careers page no longer links to the verified public jobs handoff')
    }

    const publicJobsPage = await fetchPage(PUBLIC_JOBS_URL)
    if (hasBlockedPublicJobsSignal(publicJobsPage)) {
      return []
    }

    if (
      publicJobsPage.status === 200
      && PUBLIC_JOB_SIGNAL_PATTERN.test(String(publicJobsPage.html ?? ''))
    ) {
      throw new Error('PrepInsta public jobs surface now appears usable or changed shape')
    }

    throw new Error('PrepInsta public jobs surface now appears usable or changed shape')
  },
})

export const run = async (options = {}) => createPrepinstaScraper().run(options)

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
