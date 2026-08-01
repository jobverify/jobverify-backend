import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bikayi'
export const COMPANY = 'Bikayi'
export const HOMEPAGE_URL = 'https://bikayi.com/'
export const CAREERS_URL = 'https://bikayi.com/careers'
export const EXPECTED_CAREERS_REDIRECT_URL = 'https://bikglobal.notion.site/bikayi-memo'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const ATS_HOST_PATTERN =
  /(jobs\.lever\.co|boards\.greenhouse\.io|job-boards\.greenhouse\.io|ashbyhq\.com|myworkdayjobs|workdayjobs|smartrecruiters|jobvite|darwinbox|zohorecruit|careers-page\.com|workable|icims|successfactors)/i

const normalizeWhitespace = (value) =>
  String(value ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
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

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml).toLowerCase()

  return /<title[^>]*>\s*Bikayi\s*<\/title>/i.test(rawHtml)
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/bikayi\.com\/"/i.test(rawHtml)
    && normalized.includes('bikayi')
    && normalized.includes('commerce')
    && /href=["']https:\/\/bikayi\.com\/careers["']/i.test(rawHtml)
}

export const hasOfficialMemoRedirectSignal = ({ url, html } = {}) => {
  const normalized = normalizeWhitespace(html)

  return String(url || '').startsWith(EXPECTED_CAREERS_REDIRECT_URL)
    && /<title[^>]*>\s*Notion\s*<\/title>/i.test(String(html ?? ''))
    && /JavaScript must be enabled in order to use Notion/i.test(normalized)
    && /\/_assets\/[^"']+\.js/i.test(String(html ?? ''))
}

export const hasOfficialCareersSignal = (page = {}) => hasOfficialMemoRedirectSignal(page)

export const extractSuspiciousPublicJobLinks = (html, baseUrl = EXPECTED_CAREERS_REDIRECT_URL) => {
  const suspiciousLinks = []
  const seen = new Set()

  for (const match of String(html ?? '').matchAll(/href=["']([^"']+)["']/gi)) {
    const href = match[1]
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue

    let absoluteUrl
    try {
      absoluteUrl = new URL(href, baseUrl).toString()
    } catch {
      continue
    }

    if (seen.has(absoluteUrl)) continue

    if (ATS_HOST_PATTERN.test(absoluteUrl) || /\/jobs\/[a-z0-9-]{2,}/i.test(absoluteUrl)) {
      seen.add(absoluteUrl)
      suspiciousLinks.push(absoluteUrl)
    }
  }

  return suspiciousLinks
}

export const createBikayiScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (
      homepage.status !== 200
      || (!hasOfficialHomepageSignal(homepage.html) && !hasOfficialMemoRedirectSignal(homepage))
    ) {
      throw new Error('Bikayi verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialMemoRedirectSignal(careersPage)) {
      throw new Error('Bikayi verified redirected careers surface no longer matches the known public page')
    }

    if (extractSuspiciousPublicJobLinks(careersPage.html, careersPage.url).length > 0) {
      throw new Error('Bikayi verified redirected careers surface now exposes stable public job links or public ATS links')
    }

    return []
  },
})

export const run = async (options = {}) => createBikayiScraper().run(options)

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
