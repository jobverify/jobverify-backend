import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { fetchTextWithRetry } from '../utils/fetch.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'iamneo'
export const COMPANY = 'iamneo'
export const CAREERS_URL = 'https://iamneo.ai/careers/'
export const EXTERNAL_HANDOFF_URL = 'https://iamneo.keka.com/careers'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&#8217;|&rsquo;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(value, baseUrl).toString()
  } catch {
    return null
  }
}

const trimTrailingSlash = (value) => String(value ?? '').replace(/\/+$/, '')
const IAMNEO_ORIGIN = new URL(CAREERS_URL).origin
const CAREERS_PATH = trimTrailingSlash(new URL(CAREERS_URL).pathname)

export const extractExternalHandoffUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], CAREERS_URL)
    if (absoluteUrl === EXTERNAL_HANDOFF_URL) {
      return absoluteUrl
    }
  }

  return null
}

const isFirstPartyJobRecordUrl = (value) => {
  try {
    const url = new URL(value)
    const pathname = trimTrailingSlash(url.pathname)

    return url.origin === IAMNEO_ORIGIN
      && pathname.startsWith(`${CAREERS_PATH}/`)
  } catch {
    return false
  }
}

export const extractFirstPartyJobRecordUrls = (html) => {
  const urls = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const absoluteUrl = toAbsoluteUrl(match[1], CAREERS_URL)
    if (!absoluteUrl || seen.has(absoluteUrl) || !isFirstPartyJobRecordUrl(absoluteUrl)) continue

    seen.add(absoluteUrl)
    urls.push(absoluteUrl)
  }

  return urls
}

export const hasOfficialCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/iamneo\.ai\/careers\/["']/i.test(rawHtml)
    && normalized.includes('build the future. grow with iamneo')
    && normalized.includes('join a high-performing team that’s reshaping learning, assessment, and employability with ai-powered innovation.')
    && normalized.includes('careers at neo')
    && normalized.includes('the neo edge')
    && normalized.includes('flat hierarchy')
    && normalized.includes('awards & rewards')
    && normalized.includes('flexible timings')
    && normalized.includes('no guilt leave policy')
}

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const createIamneoScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    const firstPartyJobRecordUrls = extractFirstPartyJobRecordUrls(careersHtml)

    if (firstPartyJobRecordUrls.length > 0) {
      throw new Error('iamneo first-party careers page now exposes public job records')
    }

    if (!hasOfficialCareersSignal(careersHtml) || extractExternalHandoffUrl(careersHtml) !== EXTERNAL_HANDOFF_URL) {
      throw new Error('iamneo verified first-party careers shell no longer matches the external Keka handoff sentinel')
    }

    return []
  },
})

export const run = async (options = {}) => createIamneoScraper().run(options)

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
