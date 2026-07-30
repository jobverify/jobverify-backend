import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bajajhousingfinance'
export const COMPANY = 'Bajaj Housing Finance'
export const VERIFIED_ON = '2026-07-14'
export const FIRST_PARTY_ROOT_URL = 'https://www.bajajhousingfinance.in'
export const HOMEPAGE_URL = `${FIRST_PARTY_ROOT_URL}/`
export const SITEMAP_URL = `${FIRST_PARTY_ROOT_URL}/sitemap.xml`
export const CAREER_PATHS = [
  '/career',
  '/careers',
  '/jobs',
  '/join-us',
  '/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const CAREER_ROUTE_PATTERN = /\/(?:career|careers|jobs|join-us|work-with-us)(?:\/|$)/i
const EXPECTED_HOMEPAGE_TITLE = 'Bajaj Housing Finance - Leading Non-Banking Financial Company in India'
const EXPECTED_CANONICAL_URL = 'https://www.bajajhousingfinance.in/'
const EXPECTED_HOMEPAGE_COPY_PATTERN = /\bBajaj Housing Finance\b[\s\S]*(?:home loan|housing finance|mortgage)/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim()

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

export const buildCandidateCareerUrls = () =>
  CAREER_PATHS.map((careerPath) => `${FIRST_PARTY_ROOT_URL}${careerPath}`)

export const isVerifiedHomepage = (html) => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(page.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
  const canonical = normalizeWhitespace(page.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? '')
  const text = stripTags(page)

  return title === EXPECTED_HOMEPAGE_TITLE
    && (!canonical || canonical === EXPECTED_CANONICAL_URL)
    && EXPECTED_HOMEPAGE_COPY_PATTERN.test(text)
}

export const sitemapHasCareerRoutes = (xml) =>
  [...String(xml ?? '').matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .some((url) => CAREER_ROUTE_PATTERN.test(url))

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,text/plain,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  return response.text()
}

const defaultFetchStatus = async (url) => {
  const response = await fetch(url, {
    method: 'HEAD',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (response.status === 405) {
    const fallbackResponse = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    })
    return fallbackResponse.status
  }

  return response.status
}

export const createBajajHousingFinanceScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    fetchStatus = defaultFetchStatus,
  } = {}) {
    const homepageHtml = await fetchText(HOMEPAGE_URL)
    if (!isVerifiedHomepage(homepageHtml)) {
      throw new Error(
        'Bajaj Housing Finance homepage no longer matches the verified first-party surface; re-verify before trusting []',
      )
    }

    const sitemapXml = await fetchText(SITEMAP_URL)
    if (sitemapHasCareerRoutes(sitemapXml)) {
      throw new Error(
        'Bajaj Housing Finance public sitemap now exposes a careers-like route; implement a real scraper after re-verifying the first-party jobs surface',
      )
    }

    for (const candidateUrl of buildCandidateCareerUrls()) {
      const status = await fetchStatus(candidateUrl)
      if (status !== 404) {
        throw new Error(
          `Bajaj Housing Finance common careers path no longer returns 404: ${candidateUrl} returned ${status}; re-verify before trusting []`,
        )
      }
    }

    return []
  },
})

export const run = async (options = {}) => createBajajHousingFinanceScraper().run(options)

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
