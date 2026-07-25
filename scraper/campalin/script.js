import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'campalin'
export const COMPANY = 'Campalin'
export const VERIFIED_AT = '2026-07-13'
export const HOMEPAGE_URL = 'https://campalin.in/'
export const SITEMAP_INDEX_URL = 'https://campalin.in/sitemap.xml'
export const WEBSITE_SITEMAP_URL = 'https://campalin.in/sitemap.website.xml'
export const CAREERS_ROUTE_URLS = [
  'https://campalin.in/careers',
  'https://campalin.in/career',
  'https://campalin.in/jobs',
  'https://campalin.in/job',
  'https://campalin.in/join-us',
  'https://campalin.in/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#x27;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const normalizeXml = (value) => normalizeWhitespace(value)

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

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /<title[^>]*>\s*campalin\.in\s*<\/title>/i.test(rawHtml)
    && /meta[^>]+name=["']author["'][^>]+content=["']campalin\.in["']/i.test(rawHtml)
    && /meta[^>]+name=["']generator["'][^>]+content=["']Starfield Technologies; Go Daddy Website Builder 8\.0\.0000["']/i.test(rawHtml)
    && normalized.includes('launching soon')
    && normalized.includes('contact us')
    && /copyright[\s\S]*2025[\s\S]*campalin\.in[\s\S]*all rights reserved/i.test(rawHtml)
    && /powered by/i.test(rawHtml)
}

export const hasVerifiedSitemapIndexSignal = (xml) => {
  const normalized = normalizeXml(xml)

  return normalized.includes('http://campalin.in/sitemap.website.xml')
    && normalized.includes('http://campalin.in/sitemap.ols.xml')
    && !/(career|careers|job|jobs|opening|openings|vacancy|vacancies|join-us|work-with-us)/i.test(normalized)
}

export const hasVerifiedWebsiteSitemapSignal = (xml) => {
  const normalized = normalizeXml(xml)

  return normalized.includes('http://campalin.in/')
    && normalized.includes('2025-07-28')
    && normalized.includes('weekly')
    && !/(career|careers|job|jobs|opening|openings|vacancy|vacancies|join-us|work-with-us)/i.test(normalized)
}

export const hasPublicJobsSignal = (html) => /(current openings|open positions|job openings|careers|join our team|apply now)/i.test(String(html ?? ''))

export const isVerifiedNoPublicCareersRoute = (page = {}) =>
  Number(page.status) === 404 && !hasPublicJobsSignal(page.html)

export const createCampalinScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Campalin homepage no longer matches the verified first-party placeholder surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('Campalin homepage now exposes a public jobs surface')
    }

    const sitemapIndex = await fetchPage(SITEMAP_INDEX_URL)
    if (sitemapIndex.status !== 200 || !hasVerifiedSitemapIndexSignal(sitemapIndex.html)) {
      throw new Error('Campalin sitemap index no longer matches the verified placeholder surface')
    }

    const websiteSitemap = await fetchPage(WEBSITE_SITEMAP_URL)
    if (websiteSitemap.status !== 200 || !hasVerifiedWebsiteSitemapSignal(websiteSitemap.html)) {
      throw new Error('Campalin website sitemap no longer matches the verified placeholder surface')
    }

    for (const routeUrl of CAREERS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedNoPublicCareersRoute(routePage)) {
        throw new Error(`Campalin careers route changed materially or now exposes public jobs: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createCampalinScraper().run(options)

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
