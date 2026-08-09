import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../../scraper-support/utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'lsdevicespltd'
export const COMPANY = 'LS Devices (P) Ltd'
export const VERIFIED_AT = '2026-08-03'
export const CAREERS_URL = 'https://www.lifesigns.us/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bjob openings?\b/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /breezy\.hr/i,
]

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const defaultFetchText = (url) =>
  fetchTextWithRetry(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.7',
    },
    label: SOURCE,
    timeoutMs: 15000,
  })

export const hasPublicJobsSignal = (value) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const hasVerifiedNoPublicJobsSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*careers at lifesigns\s*\|\s*challenge convention\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('explore our open roles')
    && normalized.includes('see the role')
    && normalized.includes('looking for')
    && normalized.includes('reach out to us')
    && normalized.includes('contribute')
    && normalized.includes('leave a message')
}

export const createLSDevicesScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (hasPublicJobsSignal(careersHtml)) {
      throw new Error('LS Devices (P) Ltd careers page now appears to expose public jobs')
    }
    if (!hasVerifiedNoPublicJobsSignal(careersHtml)) {
      throw new Error('LS Devices (P) Ltd careers page no longer matches the verified no-public-jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createLSDevicesScraper().run(options)

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
