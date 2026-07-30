import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { SIMPLIFY3X_SOFTWARE_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PROVIDER_METADATA = SIMPLIFY3X_SOFTWARE_CATALOG
export const SOURCE = PROVIDER_METADATA.source
export const COMPANY = PROVIDER_METADATA.companyName
export const HOMEPAGE_URL = 'https://simplify3x.com/'
export const LIFE_PAGE_URL = PROVIDER_METADATA.companyCareerPage
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://simplify3x.com/careers',
  'https://simplify3x.com/jobs',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
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

export const hasOfficialHomepageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*Simplify3x\s*-\s*AI-Driven Technology Solutions for Enterprise Transformation\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('Turning complex problems into simple solutions')
    && normalized.includes('info@simplify3x.com')
}

export const hasOfficialLifePageSignal = (html = '') => {
  const normalized = normalizeWhitespace(html)

  return /<title>\s*Life at Simplify3x\s*-\s*Where Innovation Meets People\s*<\/title>/i.test(String(html ?? ''))
    && normalized.includes('Life at Simplify3x')
    && normalized.includes('Driven by Innovation, United by Purpose')
}

export const hasPublicJobSignal = (html = '') =>
  /\b(Current Openings|Open Positions|Vacancies|Apply Now)\b/i.test(String(html ?? ''))
  || /href=["'][^"']*\/jobs?\/[^"']*["']/i.test(String(html ?? ''))

export const isVerifiedMissingJobRoute = (page = {}) =>
  [403, 404].includes(Number(page.status))
    && !hasPublicJobSignal(page.html)

export const createSimplify3xSoftwareScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Simplify3x homepage no longer matches the verified first-party surface')
    }

    const lifePage = await fetchPage(LIFE_PAGE_URL)
    if (hasPublicJobSignal(lifePage.html)) {
      throw new Error('Simplify3x life page now exposes a public jobs surface')
    }

    if (lifePage.status !== 200 || !hasOfficialLifePageSignal(lifePage.html)) {
      throw new Error('Simplify3x life page no longer matches the verified first-party surface')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)
      if (!isVerifiedMissingJobRoute(routePage)) {
        throw new Error(`Simplify3x common job route changed materially or now exposes public jobs: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createSimplify3xSoftwareScraper().run(options)

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
