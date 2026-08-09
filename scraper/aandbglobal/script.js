import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'aandbglobal'
export const COMPANY = 'A&B Global'
export const VERIFIED_AT = '2026-07-14'
export const HOMEPAGE_URL = 'https://aandbglobal.com/'
export const WORK_WITH_US_ANCHOR_URL = 'https://aandbglobal.com/#workwithus'
export const SITEMAP_URL = 'https://aandbglobal.com/wp-sitemap-posts-page-1.xml'
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://aandbglobal.com/career/',
  'https://aandbglobal.com/careers/',
  'https://aandbglobal.com/jobs/',
  'https://aandbglobal.com/job-openings/',
  'https://aandbglobal.com/work-with-us/',
  'https://aandbglobal.com/workwithus/',
  'https://aandbglobal.com/join-us/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;|&#x27;/gi, "'")
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeUrl = (value) => String(value ?? '')
  .trim()
  .replace(/\/+$/, '')
  .toLowerCase()

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page)

  return /<title>\s*A(?:&amp;|&)\s*B GLOBAL LTD\s*\|\s*One Step Away From Excellence\s*<\/title>/i.test(page)
    && /<h1[^>]*>\s*A(?:&amp;|&)\s*B Global Education\s*<\/h1>/i.test(page)
    && /href=["']#workwithus["']/i.test(page)
    && normalized.includes('Welcome to A&B Global')
    && /mailto:admin@aandbglobal\.com/i.test(page)
}

export const hasWorkWithUsPartnerSignal = (html) => {
  const normalized = normalizeWhitespace(html)

  return normalized.includes('Join with Us as A Partner')
    && normalized.includes('Contact our admission counseller and get a free consultation')
    && normalized.includes('Business Name')
    && normalized.includes('Ask us anything...')
}

export const hasPublicJobBoardSignal = (html) => {
  const page = String(html ?? '')

  return /\b(Current Openings|Open Positions|Job Openings|Open Roles|Vacancies)\b/i.test(page)
    || /href=["'][^"']*\/(?:careers?|jobs?|job-openings?)\/[^"']+["']/i.test(page)
}

export const hasSingleHomepageSitemap = (xml = '') => {
  const matches = [...String(xml ?? '').matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
  const urls = matches.map((match) => normalizeUrl(match[1])).filter(Boolean)

  return urls.length === 1 && urls[0] === normalizeUrl(HOMEPAGE_URL)
}

export const isVerifiedMissingPublicJobRoute = (page = {}) => {
  const normalized = normalizeWhitespace(page.html)

  return Number(page.status) === 404
    && /<title>\s*404 Not Found\s*\|\s*A(?:&amp;|&)\s*B GLOBAL LTD\s*<\/title>/i.test(String(page.html ?? ''))
    && normalized.includes('No Results Found')
    && !hasPublicJobBoardSignal(page.html)
}

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

export const createAandbGlobalScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('A&B Global verified official homepage no longer matches the trusted first-party surface')
    }

    if (!hasWorkWithUsPartnerSignal(homepage.html)) {
      throw new Error('A&B Global homepage no longer exposes the verified Work With Us partner popup')
    }

    if (hasPublicJobBoardSignal(homepage.html)) {
      throw new Error('A&B Global homepage now exposes a public jobs surface')
    }

    const sitemapPage = await fetchPage(SITEMAP_URL)
    if (sitemapPage.status !== 200 || !hasSingleHomepageSitemap(sitemapPage.html)) {
      throw new Error('A&B Global sitemap no longer matches the verified single-homepage first-party surface')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingPublicJobRoute(routePage)) {
        throw new Error(`A&B Global common job route changed materially or now exposes public jobs: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAandbGlobalScraper().run(options)

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
