import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'infinitylearn'
export const COMPANY = 'Infinity Learn'
export const HOMEPAGE_URL = 'https://infinitylearn.com/'
export const CAREER_URL = 'https://infinitylearn.com/career'
export const MISSING_ROUTE_URLS = [
  'https://infinitylearn.com/careers',
  'https://infinitylearn.com/jobs',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  'infinity learn india s top online learning platform for class 6 to 12',
  'power up your academic learning journey with infinity learn',
  'talk to experts',
]

const CAREER_SIGNALS = [
  'careers at infinity learn grow with india s top edtech',
  'help us build the future of education',
  'cultivating distinguished careers',
  '1200 employees growing rapidly',
  'infinity learn s selection process',
]

const MISSING_ROUTE_SIGNALS = [
  '404 page not found',
  'page not found',
  'go to home',
]

const PUBLIC_JOB_BOARD_PATTERNS = [
  /"@type"\s*:\s*"JobPosting"/i,
  /\bjobposting\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /workable\.com/i,
  /smartrecruiters/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /\/career\/[a-z0-9][a-z0-9-]{2,}(?:\/|["'#?])/i,
  /\/careers\/[a-z0-9][a-z0-9-]{2,}(?:\/|["'#?])/i,
  /\/jobs\/[a-z0-9][a-z0-9-]{2,}(?:\/|["'#?])/i,
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bview job\b/i,
  /\bjob title\b/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/[^a-z0-9:/.-]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .toLowerCase()

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
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
  const normalized = normalizeWhitespace(html)
  return HOMEPAGE_SIGNALS.every((signal) => normalized.includes(signal))
}

export const hasOfficialCareerSignal = (html) => {
  const normalized = normalizeWhitespace(html)
  return CAREER_SIGNALS.every((signal) => normalized.includes(signal))
}

export const hasPublicJobBoardSignal = (html) =>
  PUBLIC_JOB_BOARD_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedMissingRoute = (page = {}) => {
  if (Number(page?.status) !== 404) {
    return false
  }

  if (hasPublicJobBoardSignal(page?.html)) {
    return false
  }

  const normalized = normalizeWhitespace(page?.html)
  return MISSING_ROUTE_SIGNALS.every((signal) => normalized.includes(signal))
}

export const createInfinitylearnScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Infinity Learn verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobBoardSignal(homepage.html)) {
      throw new Error('Infinity Learn homepage now appears to expose public job listings')
    }

    const careerPage = await fetchPage(CAREER_URL)

    if (hasPublicJobBoardSignal(careerPage.html)) {
      throw new Error('Infinity Learn career page now appears to expose public job listings')
    }

    if (careerPage.status !== 200 || !hasOfficialCareerSignal(careerPage.html)) {
      throw new Error('Infinity Learn career page no longer matches the verified generic apply shell')
    }

    for (const routeUrl of MISSING_ROUTE_URLS) {
      const missingRoute = await fetchPage(routeUrl)

      if (!isVerifiedMissingRoute(missingRoute)) {
        throw new Error('Infinity Learn missing careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createInfinitylearnScraper().run(options)

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
