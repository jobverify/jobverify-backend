import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const SOURCE = 'scapic'
export const COMPANY = 'Scapic'
export const OFFICIAL_BRAND = 'Scapic'
export const CAREERS_URL = 'https://www.flipkartcareers.com/jobslist'
export const DISPOSITION = 'verified-parent-careers-surface-acquisition-context-fail-closed'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.flipkartcareers.com/jobslist was the live parent-company careers surface reviewed for Scapic after its Flipkart acquisition. This batch only pins the exact workbook name to the verified public company surface, and no batch-04 company-specific openings parser has been promoted for the acquired brand context yet, so the provider remains fail-closed and returns no jobs until a verifiable public openings flow is implemented.'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const TITLE_PARENT_SURFACE_PATTERN =
  /<title[^>]*>[\s\S]*\bflipkart\b[\s\S]*\bcareers?\b[\s\S]*<\/title>/i
const CANONICAL_SURFACE_PATTERN =
  /<(?:link|meta)\b[^>]+(?:href|content)=["']https:\/\/www\.flipkartcareers\.com\/jobslist\/?["'][^>]*>/i
const REQUIRED_TEXT_PATTERNS = [/\bflipkart\b/i, /\bcareers?\b/i]
const CURRENT_PARENT_SURFACE_PATTERNS = [
  /\bexplore for opportunities here\b/i,
  /\bcurrent openings\b/i,
]
const SCAPIC_SIGNAL_PATTERN = /\bscapic\b/i

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePathname = (value = '') => {
  const normalized = String(value).trim().replace(/\/+$/, '')
  return normalized || '/'
}

const isVerifiedCareersUrl = (value = CAREERS_URL) => {
  try {
    const expected = new URL(CAREERS_URL)
    const current = new URL(value, CAREERS_URL)

    return current.origin === expected.origin
      && normalizePathname(current.pathname) === normalizePathname(expected.pathname)
  } catch {
    return false
  }
}

const extractLinkedUrls = (html = '', pageUrl = CAREERS_URL) => {
  const urls = []
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url|data-href|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''

    try {
      urls.push(new URL(rawValue, pageUrl))
    } catch {
      // Ignore malformed URLs and keep the sentinel fail-closed.
    }
  }

  return urls
}

export const hasVerifiedParentCareersSurface = (html = '') => {
  const rawHtml = String(html)
  const text = normalizeText(rawHtml)

  return TITLE_PARENT_SURFACE_PATTERN.test(rawHtml)
    && REQUIRED_TEXT_PATTERNS.every((pattern) => pattern.test(text))
    && (
      CANONICAL_SURFACE_PATTERN.test(rawHtml)
      || CURRENT_PARENT_SURFACE_PATTERNS.every((pattern) => pattern.test(text))
    )
}

export const detectScapicSpecificSignal = (html = '', pageUrl = CAREERS_URL) => {
  const text = normalizeText(html)
  if (SCAPIC_SIGNAL_PATTERN.test(text)) return 'scapic text signal'

  const linkedUrl = extractLinkedUrls(html, pageUrl).find((url) =>
    SCAPIC_SIGNAL_PATTERN.test(url.hostname)
    || SCAPIC_SIGNAL_PATTERN.test(`${url.pathname}${url.search}${url.hash}`),
  )

  return linkedUrl ? linkedUrl.toString() : null
}

const assertVerifiedParentCareersSurface = (page = {}) => {
  if (isVerifiedCareersUrl(page.url || CAREERS_URL) && hasVerifiedParentCareersSurface(page.html)) {
    return
  }

  throw new Error(
    'Scapic verified parent-company careers surface no longer matches the local contract.',
  )
}

export const createScapicScraper = ({ careersUrl = CAREERS_URL } = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(careersUrl)
    assertVerifiedParentCareersSurface(page)

    const scapicSignal = detectScapicSpecificSignal(page.html, page.url || careersUrl)
    if (scapicSignal) {
      throw new Error(
        `Scapic parent-company careers surface now exposes an explicit Scapic-specific signal: ${scapicSignal}`,
      )
    }

    return []
  },
})

export const run = async (options = {}) => createScapicScraper().run(options)

export const runStandalone = async ({
  argv = process.argv,
  runScraper = run,
  saveToFileImpl,
  saveToDbImpl,
} = {}) => {
  const { saveToDB, saveToFile } = await import('../../scraper-support/utils/saveToDB.js')
  const isDryRun = argv.includes('--dry-run')
  const jobs = await runScraper()

  if (isDryRun) {
    ;(saveToFileImpl || saveToFile)(jobs, path.join(currentDir, 'jobs.json'))
    return jobs
  }

  await (saveToDbImpl || saveToDB)(jobs, SOURCE)
  return jobs
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await runStandalone()
}
