import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOMEPAGE_URL = 'https://tutrhyperloop.com/'
export const CAREER_URLS = [
  'https://tutrhyperloop.com/careers',
  'https://tutrhyperloop.com/career',
  'https://tutrhyperloop.com/jobs',
  'https://tutrhyperloop.com/join-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

const PARKED_TITLE_PATTERN = /<title>\s*tutrhyperloop\.com\s*<\/title>/i
const PARKED_BODY_PATTERNS = [
  /\bthis domain may be for sale\b/i,
  /\bsponsored listings\b/i,
  /\btutrhyperloop\.com\b/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasParkedDomainTitle = (html) =>
  PARKED_TITLE_PATTERN.test(String(html ?? ''))

export const hasParkedDomainSignals = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()
  return hasParkedDomainTitle(html) && PARKED_BODY_PATTERNS.every((pattern) => pattern.test(normalized))
}

const hasVerifiedParkedPage = (page) =>
  Number(page?.status) === 200 && hasParkedDomainSignals(page?.html)

export const createTutrHyperloopScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (!hasVerifiedParkedPage(homepage)) {
      throw new Error('Tutr Hyperloop verified first-party surface no longer matches the parked-domain sentinel')
    }

    for (const url of CAREER_URLS) {
      const page = await fetchPage(url)
      if (!hasVerifiedParkedPage(page)) {
        throw new Error('Tutr Hyperloop verified first-party surface no longer matches the parked-domain sentinel')
      }
    }

    return []
  },
})

export const run = async () => createTutrHyperloopScraper().run()

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = process.argv.includes('--dry-run')
  const jobs = await run()

  if (isDryRun) {
    saveToFile(jobs, path.join(currentDir, 'jobs.json'))
  } else {
    await saveToDB(jobs, 'tutrhyperloop')
  }
}
