import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bizongo'
export const COMPANY = 'Bizongo'
export const CAREERS_URL = 'https://bizongo.com/careers'
export const CAREERS_HANDOFF_URL = 'https://careers.bizongo.com/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bjob opportunities\b/i,
  /\bcareer opportunities\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bjoin our team\b/i,
  /\bwe(?:'re| are)? hiring\b/i,
  /\bvacan(?:cy|cies)\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
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

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/(?:www\.)?bizongo\.com\/careers["']/i.test(page)
    && normalized.includes('careers')
    && page.includes(CAREERS_HANDOFF_URL)
}

const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

const hasBrokenHandoffSignal = ({ status, html } = {}) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return status >= 400
    || normalized.includes('not found')
    || normalized.includes('access denied')
    || normalized.includes('forbidden')
}

const isExpectedHandoffFailure = (error) => {
  const normalized = normalizeWhitespace(error?.message).toLowerCase()

  return normalized.includes('fetch failed')
    || normalized.includes('ssl')
    || normalized.includes('tls')
    || normalized.includes('secure channel')
}

export const createBizongoScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const careersPage = await fetchPage(CAREERS_URL)

    if (!hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Expected verified Bizongo careers page with the official careers host handoff')
    }

    try {
      const handoffPage = await fetchPage(CAREERS_HANDOFF_URL)
      if (hasBrokenHandoffSignal(handoffPage)) {
        return []
      }

      if (hasPublicJobsSignal(handoffPage.html)) {
        throw new Error('Bizongo verified broken Bizongo careers host state changed and now appears to expose public jobs')
      }

      throw new Error('Bizongo verified broken careers host state changed materially')
    } catch (error) {
      if (isExpectedHandoffFailure(error)) {
        return []
      }

      throw error
    }
  },
})

export const run = async (options = {}) => createBizongoScraper().run(options)

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
