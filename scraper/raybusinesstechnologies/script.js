import path from 'node:path'
import { fileURLToPath } from 'node:url'

import provider from './provider.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = provider
export const SOURCE = provider.source
export const COMPANY = provider.companyName
export const CAREERS_URL = provider.companyCareerPage

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify scraper)'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const hasOfficialCareersShellSignal = (html = '') => {
  const page = String(html ?? '')
  const text = normalizeWhitespace(page).toLowerCase()

  return /<title>\s*Ray Business Technologies Careers - Discover a World of Opportunities\s*<\/title>/i.test(page)
    && text.includes('search jobs')
    && text.includes('careers')
    && text.includes('current openings')
    && text.includes('working with us is not a job. it\'s a journey.')
}

export const hasTrustworthyPublicJobsSignal = (html = '') => {
  const text = normalizeWhitespace(html).toLowerCase()

  return (
    /\bapply now\b/.test(text)
    || /\bclick to explore this job\b/.test(text)
    || /class=["'][^"']*job-card/i.test(String(html ?? ''))
  )
}

export const run = async ({ fetchText = defaultFetchText } = {}) => {
  const html = await fetchText(CAREERS_URL)

  if (!hasOfficialCareersShellSignal(html)) {
    throw new Error('Ray Business Technologies verified careers shell no longer matches the trusted first-party surface')
  }

  if (hasTrustworthyPublicJobsSignal(html)) {
    throw new Error('Ray Business Technologies exact-name surface now exposes a trustworthy public jobs surface')
  }

  return []
}

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
