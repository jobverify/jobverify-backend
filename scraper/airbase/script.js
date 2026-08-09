import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { AIRBASE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = AIRBASE_CATALOG.source
export const COMPANY = AIRBASE_CATALOG.companyName
export const HOMEPAGE_URL = 'https://www.airbase.com/'
export const CAREERS_ROUTE_URL = AIRBASE_CATALOG.companyCareerPage
export const PARENT_CAREERS_URL = AIRBASE_CATALOG.parentCareersPage
export const NO_PUBLIC_CAREER_ROUTE_URLS = [
  'https://www.airbase.com/career',
  'https://www.airbase.com/jobs',
  'https://www.airbase.com/join-us',
  'https://www.airbase.com/work-with-us',
  'https://www.airbase.com/openings',
  'https://www.airbase.com/current-openings',
]

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

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Airbase, a Paylocity Company \| Airbase by Paylocity/i.test(rawHtml)
    && /Paylocity for Finance combines our advanced spend management capabilities with Paylocity(?:'|’)?s robust HCM platform/i.test(normalized)
    && /What does this mean for Airbase clients\?/i.test(normalized)
    && /Airbase Inc\./i.test(normalized)
    && /href="https:\/\/www\.paylocity\.com\/"/i.test(rawHtml)
}

export const hasGenericParentCareersSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)
  const isFullPaylocityCareersPage = /Careers \| Paylocity \| Paylocity/i.test(rawHtml)
    && /Sure, we build great products, but we also want Paylocity to be a great place to work\./i.test(normalized)
    && /Join us as we help clients solve problems and shape the future of work\./i.test(normalized)
    && /Protect yourself\./i.test(normalized)
  const isPaylocityJavaScriptShell = /For the best experience,\s*we recommend enabling JavaScript in your browser\./i.test(normalized)

  return (isFullPaylocityCareersPage || isPaylocityJavaScriptShell)
    && !/\bAirbase\b/i.test(rawHtml)
}

export const isMissingCareerRoute = (page) => Number(page?.status) === 404

export const createAirbaseScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Airbase verified official homepage no longer matches the known public surface')
    }

    const careersPage = await fetchPage(CAREERS_ROUTE_URL)
    const finalUrl = careersPage.url || careersPage.finalUrl || CAREERS_ROUTE_URL

    if (finalUrl !== PARENT_CAREERS_URL) {
      throw new Error('Airbase verified parent careers redirect no longer matches the known Paylocity handoff')
    }

    if (careersPage.status !== 200 || !hasGenericParentCareersSignal(careersPage.html)) {
      throw new Error('Airbase verified generic parent careers surface no longer matches the known public surface')
    }

    for (const routeUrl of NO_PUBLIC_CAREER_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isMissingCareerRoute(routePage)) {
        throw new Error(`Airbase verified no-public-careers route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAirbaseScraper().run(options)

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
