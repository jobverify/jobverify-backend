import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { ACULIFE_PROVIDER } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = ACULIFE_PROVIDER.source
export const COMPANY = ACULIFE_PROVIDER.companyName
export const VERIFIED_SURFACE_SUMMARY = ACULIFE_PROVIDER.verifiedSurfaceSummary
export const HOMEPAGE_URL = 'https://www.aculife.co.in/resource/home.aspx'
export const CAREER_PAGE_URL = ACULIFE_PROVIDER.companyCareerPage
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://www.aculife.co.in/careers',
  'https://www.aculife.co.in/career',
  'https://www.aculife.co.in/jobs',
  'https://www.aculife.co.in/openings',
  'https://www.aculife.co.in/current-openings',
  'https://www.aculife.co.in/join-us',
  'https://www.aculife.co.in/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const stripTags = (value) => String(value ?? '').replace(/<[^>]+>/g, ' ')

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;|&rsquo;/gi, "'")

const normalizeWhitespace = (value) => decodeHtmlEntities(stripTags(value))
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

  return /Aculife Healthcare Private Limited/i.test(normalized)
    && /Health is Happiness/i.test(normalized)
    && /1 in every 6 IV fluids & diluents in India/i.test(normalized)
    && /corporate@aculife\.co\.in/i.test(rawHtml)
    && /resource\/career\.aspx/i.test(rawHtml)
}

export const hasOfficialCareerFormSignal = (html) => {
  const rawHtml = String(html ?? '')
  const normalized = normalizeWhitespace(rawHtml)

  return /Apply Here/i.test(normalized)
    && (/Apply via the form given below/i.test(normalized) || /We nurture and cultivate a sense/i.test(normalized))
    && /First name/i.test(normalized)
    && /Position you are applying for/i.test(normalized)
    && /Upload Resume/i.test(normalized)
    && /Years Of Experience/i.test(normalized)
}

export const isMissingPublicJobRoute = (page) => Number(page?.status) === 404

export const createAculifeScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Aculife verified official homepage no longer matches the known public surface')
    }

    const careerPage = await fetchPage(CAREER_PAGE_URL)
    if (careerPage.status !== 200 || !hasOfficialCareerFormSignal(careerPage.html)) {
      throw new Error('Aculife verified first-party career form no longer matches the no-public-jobs surface')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isMissingPublicJobRoute(routePage)) {
        throw new Error(`Aculife verified no-public-job route changed: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createAculifeScraper().run(options)

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
