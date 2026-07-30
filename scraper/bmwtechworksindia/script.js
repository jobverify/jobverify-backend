import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { withRetry } from '../utils/retry.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

export const SOURCE = 'bmwtechworksindia'
export const COMPANY = 'BMW TechWorks India'
export const VERIFIED_ON = '2026-07-25'
export const HOMEPAGE_URL = 'https://www.bmwtechworks.in/'
export const CAREERS_PAGE_URL = 'https://www.bmwtechworks.in/careers/'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
  /\bjob description\b/i,
  /\bjob details?\b/i,
  /\bjob id\b/i,
  /\bjob requisition\b/i,
  /\bview job\b/i,
  /\bview role\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&#038;|&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/[‘’]/g, "'")
  .replace(/[“”]/g, '"')
  .replace(/[–—]/g, '-')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeComparableUrl = (value) => {
  try {
    const url = new URL(String(value ?? '').trim())
    url.hash = ''
    url.search = ''

    if (!url.pathname || url.pathname === '/') {
      return `${url.origin}/`
    }

    return `${url.origin}${url.pathname.replace(/\/+$/, '')}/`
  } catch {
    return null
  }
}

const defaultFetchPage = (url, { signal } = {}) => withRetry(async () => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
    signal,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return {
    finalUrl: response.url,
    html: await response.text(),
  }
}, {
  attempts: 3,
  baseDelayMs: 2000,
  label: SOURCE,
  signal,
})

export const hasPublicJobsSignal = (html = '') =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialHomepageSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return text.includes('BMW Group & TATA Technologies:')
    && /BMW TechWorks India brings together the BMW Group/i.test(text)
    && text.includes('focuses exclusively on strategic software development')
    && text.includes('Copyright 2026 BMW TechWorks India Pvt Ltd. All rights reserved')
}

export const hasCareerCategoryShellSignal = (html = '') => {
  const text = normalizeWhitespace(html)

  return /Where Seamless Innovation Begins/i.test(text)
    && /Beyond the Resume:\s*Our 3D Hiring Experience/i.test(text)
    && /Roles We.?re Hiring For/i.test(text)
    && /Embedded Software Engineers/i.test(text)
    && /DevOps CI[-/]CD/i.test(text)
    && /Automotive Vehicle Integration/i.test(text)
}

export const createBmwTechWorksIndiaScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      normalizeComparableUrl(homepage?.finalUrl) !== normalizeComparableUrl(HOMEPAGE_URL)
      || !hasOfficialHomepageSignal(homepage?.html)
    ) {
      throw new Error('Verified BMW TechWorks India homepage signal changed materially')
    }

    const careersPage = await fetchPage(CAREERS_PAGE_URL)
    if (hasPublicJobsSignal(careersPage?.html)) {
      throw new Error('BMW TechWorks India careers surface now appears to expose public jobs')
    }

    if (
      normalizeComparableUrl(careersPage?.finalUrl) !== normalizeComparableUrl(CAREERS_PAGE_URL)
      || !hasCareerCategoryShellSignal(careersPage?.html)
    ) {
      throw new Error('Verified BMW TechWorks India careers shell changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createBmwTechWorksIndiaScraper().run(options)

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
