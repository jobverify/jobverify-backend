import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'velammalgroupofschools'
export const COMPANY = 'Velammal Group of schools'
export const HOMEPAGE_URL = 'https://velammal.org/'
export const CAREER_URL = 'https://velammal.org/career/'
export const JOBS_URL = 'https://velammal.org/jobs/'
export const CHECKED_NO_LISTING_URLS = [
  'https://velammal.org/careers/',
  'https://velammal.org/current-openings/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bjob search\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bapply now\b/i,
  /\bjob posting\b/i,
  /\bjobpostid\b/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /smartrecruiters/i,
  /jobvite/i,
  /\/job\/[a-z0-9-]+/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&amp;/gi, '&')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const isOfficialVelammalUrl = (value) => {
  try {
    const parsed = new URL(value || HOMEPAGE_URL)
    return parsed.hostname === 'velammal.org' && parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('velammal new gen edu network')
    && normalized.includes('velammal group')
    && normalized.includes('velammal educational trust')
    && /href=["']https:\/\/velammal\.org\/admission\/["']/i.test(page)
}

export const hasOfficialCareerSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('when a teacher inspires, generations progress')
    && normalized.includes('apply with this application')
    && normalized.includes('upload resume')
    && normalized.includes('velammal educational trust')
    && normalized.includes('shri m.v. muthuramalingam')
}

export const hasVerifiedEmptyJobsPageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeWhitespace(page).toLowerCase()

  return normalized.includes('jobs')
    && normalized.includes('velammal new gen edu network')
    && /action=["']https:\/\/velammal\.org\/jobs\/["']/i.test(page)
    && /class=["'][^"']*no-job-listing[^"']*["']/i.test(page)
    && normalized.includes('no jobs found')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isVerifiedNoListingRoute = (page = {}) => {
  if (!isOfficialVelammalUrl(page.url)) {
    return false
  }

  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  const normalized = normalizeWhitespace(page.html).toLowerCase()

  return Number(page.status) === 404
    || (
      normalized.includes('page not found')
      && normalized.includes('velammal new gen edu network')
      && normalized.includes('back to home')
    )
}

export const createVelammalGroupOfSchoolsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (
      homepage.status !== 200
      || !isOfficialVelammalUrl(homepage.url)
      || !hasOfficialHomepageSignal(homepage.html)
    ) {
      throw new Error('Velammal Group of schools verified official homepage no longer matches the trusted first-party surface')
    }

    const careerPage = await fetchPage(CAREER_URL)
    if (
      careerPage.status !== 200
      || !isOfficialVelammalUrl(careerPage.url)
      || !hasOfficialCareerSignal(careerPage.html)
    ) {
      throw new Error('Velammal Group of schools verified official career application page no longer matches the trusted first-party surface')
    }

    if (hasPublicJobsSignal(careerPage.html)) {
      throw new Error('Velammal Group of schools career page now appears to expose a public jobs surface')
    }

    const jobsPage = await fetchPage(JOBS_URL)
    if (
      jobsPage.status !== 200
      || !isOfficialVelammalUrl(jobsPage.url)
      || !hasVerifiedEmptyJobsPageSignal(jobsPage.html)
      || hasPublicJobsSignal(jobsPage.html)
    ) {
      throw new Error('Velammal Group of schools verified empty jobs page no longer matches the trusted first-party surface')
    }

    for (const url of CHECKED_NO_LISTING_URLS) {
      const page = await fetchPage(url)
      if (!isVerifiedNoListingRoute(page)) {
        throw new Error(`Velammal Group of schools no-listing route no longer matches the verified first-party surface: ${url}`)
      }
    }

    return []
  },
})

export const run = async (options = {}) => createVelammalGroupOfSchoolsScraper().run(options)

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
