import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bharatserumsandvaccines'
export const COMPANY = 'Bharat Serums and Vaccines'
export const HOMEPAGE_URL = 'https://bsvgroup.com/'
export const CAREERS_URL = 'https://bsvgroup.com/work-at-bsv/'
export const CHECKED_NO_JOBS_ROUTE_URLS = [
  'https://bsvgroup.com/careers',
  'https://bsvgroup.com/jobs',
  'https://bsvgroup.com/join-us',
  'https://bsvgroup.com/current-openings',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bopen positions?\b/i,
  /\bcurrent openings?\b/i,
  /\bjob openings?\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bapply now\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /freshteam/i,
  /zohorecruit/i,
  /icims/i,
  /successfactors/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractTitle = (html) =>
  normalizeWhitespace(String(html ?? '').match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')

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
  const page = String(html ?? '')
  const visibleText = normalizeWhitespace(page)
  const title = extractTitle(page)

  return title === 'BSV Group'
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/bsvgroup\.com\/"/i.test(page)
    && visibleText.includes('BSV Group')
    && (
      visibleText.includes('fastest growing biopharmaceutical companies in India')
      || visibleText.includes('BSV (A Mankind Group Company)')
    )
    && visibleText.includes('Life at BSV')
  }

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const visibleText = normalizeWhitespace(page)
  const title = extractTitle(page)

  return /^Work at BSV\b/i.test(title)
    && /<link[^>]+rel="canonical"[^>]+href="https:\/\/bsvgroup\.com\/work-at-bsv\/"/i.test(page)
    && visibleText.includes('Work at BSV')
    && visibleText.includes('BSV - A Mankind Group Company')
}

export const pageExposesPublicJobListings = (html) => {
  const haystacks = [String(html ?? ''), normalizeWhitespace(html)]
  return PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) =>
    haystacks.some((haystack) => pattern.test(haystack)),
  )
}

export const isVerifiedMissingJobsRoute = (page = {}) => page.status === 404

export const createBharatSerumsAndVaccinesScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Bharat Serums and Vaccines verified official homepage no longer matches the known public surface')
    }

    if (pageExposesPublicJobListings(homepage.html)) {
      throw new Error('Bharat Serums and Vaccines homepage now exposes public job listings')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Bharat Serums and Vaccines verified official careers surface no longer matches the known public page')
    }

    if (pageExposesPublicJobListings(careersPage.html)) {
      throw new Error('Bharat Serums and Vaccines official careers surface now exposes public job listings')
    }

    for (const routeUrl of CHECKED_NO_JOBS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedMissingJobsRoute(routePage)) {
        throw new Error(`Bharat Serums and Vaccines checked alternate first-party jobs route changed materially: ${routePage.url || routeUrl}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createBharatSerumsAndVaccinesScraper().run(options)

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
