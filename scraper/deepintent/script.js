import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DEEP_INTENT_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = DEEP_INTENT_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = PROVIDER_METADATA.homepageUrl
export const CAREERS_URL = PROVIDER_METADATA.companyCareerPage
const HOMEPAGE_ORIGIN = new URL(HOMEPAGE_URL).origin

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")
  .replace(/&quot;/gi, '"')
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
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const extractLikelyJobLinks = (html) => {
  const links = []

  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = String(match[1] ?? '')
    const text = normalizeWhitespace(match[2])
    const loweredHref = href.toLowerCase()

    if (
      /\/jobs\/[^"'#]+/i.test(loweredHref)
      || /\/job\/[^"'#]+/i.test(loweredHref)
      || /\/openings\/[^"'#]+/i.test(loweredHref)
      || /jobs\.lever\.co/i.test(loweredHref)
      || /boards\.greenhouse\.io/i.test(loweredHref)
      || /job-boards\.greenhouse\.io/i.test(loweredHref)
      || /apply\.workable\.com/i.test(loweredHref)
      || /ashbyhq\.com/i.test(loweredHref)
    ) {
      links.push({
        href,
        text,
      })
    }
  }

  return links
}

const hasStructuredJobPostingSignal = (html) =>
  /["']@type["']\s*:\s*["']JobPosting["']|itemtype=["']https?:\/\/schema\.org\/JobPosting["']/i.test(
    String(html ?? ''),
  )

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /DeepIntent/i.test(normalized)
    && /the leading Healthcare Advertising Platform/i.test(normalized)
    && /Shaping the Future of Healthcare Advertising/i.test(normalized)
    && extractCareersUrl(rawHtml) === CAREERS_URL
}

export const extractCareersUrl = (html) => {
  for (const match of String(html ?? '').matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Careers\s*<\/a>/gi)) {
    const href = String(match[1] ?? '')

    try {
      const careersUrl = new URL(href, HOMEPAGE_URL)
      const normalizedPath = careersUrl.pathname.replace(/\/+$/, '') || '/'

      if (careersUrl.origin === HOMEPAGE_ORIGIN && normalizedPath === '/careers') {
        return `${careersUrl.origin}${normalizedPath}`
      }
    } catch {
      continue
    }
  }

  return null
}

export const hasVerifiedCareersShell = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Careers/i.test(normalized)
    && /Innovate at the Heart of Healthcare and Advertising with Us/i.test(normalized)
    && /The People Who Power the Platform/i.test(normalized)
    && /Our Promise to All DeepIntent Employees/i.test(normalized)
    && /Join Our Team/i.test(normalized)
    && /Why Work at DeepIntent\?/i.test(normalized)
    && /Open Positions/i.test(normalized)
    && /updates@deepintent\.com/i.test(normalized)
    && !hasStructuredJobPostingSignal(rawHtml)
    && extractLikelyJobLinks(rawHtml).length === 0
}

export const createDeepIntentScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('DeepIntent homepage no longer matches the verified careers handoff')
    }

    if (extractCareersUrl(homepage.html) !== CAREERS_URL) {
      throw new Error('DeepIntent homepage Careers link changed materially')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (extractLikelyJobLinks(careersPage.html).length > 0 || hasStructuredJobPostingSignal(careersPage.html)) {
      throw new Error('DeepIntent careers page now appears to expose public job links')
    }

    if (careersPage.status !== 200 || !hasVerifiedCareersShell(careersPage.html)) {
      throw new Error('DeepIntent verified first-party careers page no longer matches the known public surface')
    }

    return []
  },
})

export const run = async (options = {}) => createDeepIntentScraper().run(options)

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
