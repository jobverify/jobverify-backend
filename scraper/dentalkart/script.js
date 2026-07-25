import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DENTALKART_CATALOG } from './catalog.js'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = DENTALKART_CATALOG.source
export const COMPANY = DENTALKART_CATALOG.companyName
export const VERIFIED_AT = DENTALKART_CATALOG.verifiedOn
export const HOMEPAGE_URL = DENTALKART_CATALOG.homepageUrl
export const ABOUT_URL = DENTALKART_CATALOG.aboutPageUrl
export const CAREERS_URL = DENTALKART_CATALOG.companyCareerPage
export const VERIFIED_SURFACE_SUMMARY = DENTALKART_CATALOG.verifiedSurfaceSummary
export const NO_PUBLIC_JOB_ROUTE_URLS = [
  'https://www.dentalkart.com/career',
  'https://www.dentalkart.com/jobs',
  'https://www.dentalkart.com/openings',
  'https://www.dentalkart.com/current-openings',
  'https://www.dentalkart.com/join-us',
  'https://www.dentalkart.com/work-with-us',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOB_SIGNAL_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bapply now\b/i,
  /\bview jobs\b/i,
  /\bjob vacancy\b/i,
  /\bwe(?:'|&#x27;)?re hiring\b/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /successfactors/i,
  /oraclecloud/i,
  /darwinbox/i,
  /icims/i,
  /taleo/i,
  /peoplestrong/i,
]

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

const getFinalUrl = (page, fallbackUrl) => page?.url || page?.finalUrl || fallbackUrl

export const hasOfficialHomepageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Dentalkart - India(?:&#x27;|')s Largest Online Dental Store\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Dentalkart is India(?:&#x27;|')s largest online dental store that provides premium dental equipment, instruments, materials, consumables, and laboratory products\.[^"']*["']/i.test(rawHtml)
    && /Search over 20,000 Dental Products/i.test(rawHtml)
}

export const hasOfficialAboutPageSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*About Us\s*(?:·|Â·)\s*Dentalkart\s*<\/title>/i.test(rawHtml)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Dentalkart was built by dentists, for dentists\.[^"']*Listed on NSE Emerge as DENTALKART\.[^"']*["']/i.test(rawHtml)
    && /2 lakh\+ clinics/i.test(rawHtml)
    && /Listed on NSE Emerge as DENTALKART/i.test(rawHtml)
}

export const hasOfficialCareersShellSignal = (html) => {
  const rawHtml = String(html ?? '')

  return /<title>\s*Buy Dental Products\s*<\/title>/i.test(rawHtml)
    && /\/_next\/static\/chunks\/app\/careers\/page-[^"']+\.js/i.test(rawHtml)
    && /Search over 20,000 Dental Products/i.test(rawHtml)
}

export const hasPublicJobListingSignal = (html) =>
  PUBLIC_JOB_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isKnownMissingJobRoute = (page = {}, requestedUrl) =>
  Number(page.status) === 404
  && getFinalUrl(page, requestedUrl) === requestedUrl
  && !hasPublicJobListingSignal(page.html)

export const createDentalkartScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Dentalkart verified official homepage no longer matches the known surface')
    }

    const aboutPage = await fetchPage(ABOUT_URL)
    if (aboutPage.status !== 200 || !hasOfficialAboutPageSignal(aboutPage.html)) {
      throw new Error('Dentalkart verified about page no longer matches the known surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (hasPublicJobListingSignal(careersPage.html)) {
      throw new Error('Dentalkart careers page now appears to expose a public jobs surface')
    }

    if (careersPage.status !== 200 || !hasOfficialCareersShellSignal(careersPage.html)) {
      throw new Error('Dentalkart verified official careers surface no longer matches the known surface')
    }

    for (const routeUrl of NO_PUBLIC_JOB_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isKnownMissingJobRoute(routePage, routeUrl)) {
        throw new Error(`Dentalkart verified no-public-job route changed: ${getFinalUrl(routePage, routeUrl)}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createDentalkartScraper().run(options)

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
