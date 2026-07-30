import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

import { SKYSCANNER_CATALOG as PROVIDER_METADATA } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export { PROVIDER_METADATA }
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const OFFICIAL_BRAND_NAME = PROVIDER_METADATA.officialBrandName
export const VERIFIED_ON = PROVIDER_METADATA.verifiedOn
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ')
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
  timeoutMs: 20000,
})

export const hasVerifiedJobsShellSignal = (html = '') => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(html)
  return /\bCurrent jobs\b/i.test(normalized)
    && /All teams/i.test(normalized)
    && /All locations/i.test(normalized)
    && /Search by title, team or location/i.test(page)
}

export const hasEnumerableJobsSignal = (html = '') => {
  const page = String(html ?? '')
  return /(?:href|url)=["'][^"']*\/jobs\/job\/\d+/i.test(page)
    || /https?:\/\/[^"'\s]*skyscanner[^"'\s]*\/jobs\/job\/\d+/i.test(page)
    || /(?:jobId|jobTitle|jobLocation|jobDescription)\s*[:=]/i.test(page)
}

export const hasChallengeGateSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)
  const page = String(html ?? '')
  const hasStaticChallengeShell = /<title>\s*Skyscanner\s*<\/title>/i.test(page)
    && /<noscript>\s*You need to enable JavaScript to run this app\.\s*<\/noscript>/i.test(page)
    && /<div[^>]+id=["']root["'][^>]*>/i.test(page)
    && /(?:href|src)=["']\.\/static\/(?:js|css)\/main\.[^"']+["']/i.test(page)

  return hasStaticChallengeShell
    || (
      /<title>\s*Skyscanner\s*<\/title>/i.test(page)
      && /Are you a person or a robot\?/i.test(normalized)
      && /Please don(?:'|\u2019)t take this personally/i.test(normalized)
      && /You need to enable JavaScript to run this app\./i.test(normalized)
    )
}

export const createSkyscannerScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    if (hasEnumerableJobsSignal(careersHtml)) {
      throw new Error('Skyscanner surface now appears to expose enumerable public jobs')
    }

    if (hasChallengeGateSignal(careersHtml)) {
      return []
    }

    if (!hasVerifiedJobsShellSignal(careersHtml)) {
      throw new Error('Skyscanner verified first-party jobs page no longer matches the trusted filter shell')
    }

    return []
  },
})

export const run = async (options = {}) => createSkyscannerScraper().run(options)

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
