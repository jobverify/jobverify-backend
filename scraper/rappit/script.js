import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'rappit'
export const COMPANY = 'Rappit'
export const HOMEPAGE_URL = 'https://rappit.io/'
export const ABOUT_URL = 'https://rappit.io/about-us/'
export const CAREERS_URL = 'https://rappit.io/about-us/careers/'
export const VACANCIES_URL = 'https://rappit.io/vacancies/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bsearch jobs\b/i,
  /\bjob openings\b/i,
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bview jobs\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /greenhouse\.io/i,
  /vacancies\/[^"'`\s<>]+/i,
]

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
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('rappit')
    && normalized.includes('business apps')
    && normalized.includes('about us')
}

export const hasRebrandAboutSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('vanenburg software started in 2009')
    && normalized.includes('vanenburg rebrands to rappit in 2024')
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('careers')
    && normalized.includes('vacancies')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const hasEmptyVacanciesSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('job openings')
    && normalized.includes('0 vacancies')
}

export const createRappitScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Rappit homepage no longer matches the verified official public surface')
    }

    const aboutPage = await fetchPage(ABOUT_URL)
    if (aboutPage.status !== 200 || !hasRebrandAboutSignal(aboutPage.html)) {
      throw new Error('Rappit about page no longer matches the verified Vanenburg rebrand proof')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Rappit careers page changed materially or no longer matches the verified first-party handoff')
    }

    const vacanciesPage = await fetchPage(VACANCIES_URL)
    if (vacanciesPage.status !== 200 || !hasEmptyVacanciesSignal(vacanciesPage.html)) {
      throw new Error('Rappit vacancies page changed materially or no longer matches the verified empty-board state')
    }

    if (hasPublicJobsSignal(vacanciesPage.html) && !/0 vacancies/i.test(vacanciesPage.html)) {
      throw new Error('Rappit vacancies page now appears to expose a public jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createRappitScraper().run(options)

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
