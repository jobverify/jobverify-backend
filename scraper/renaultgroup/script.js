import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'renaultgroup'
export const COMPANY = 'Renault Group'
export const HOMEPAGE_URL = 'https://www.renaultgroup.com/en/'
export const CAREERS_URL = 'https://www.renaultgroup.com/en/careers/'
export const OFFERS_URL = 'https://www.renaultgroup.com/en/careers/our-international-vacancies/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bapply now\b/i,
  /\bjob description\b/i,
  /\bview details\b/i,
  /\bopen positions\b/i,
  /\bcurrent openings\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /greenhouse\.io/i,
  /recruitcrm/i,
  /linkedin\.com\/jobs/i,
  /href=["'][^"']*\/jobs\/[^"']+/i,
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

  return normalized.includes('renault group')
    && normalized.includes('careers')
    && normalized.includes('news about the group')
    && normalized.includes('legal notices')
    && normalized.includes('security and confidentiality')
}

export const hasOfficialCareersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('a career at the centre of the automotive revolution')
    && normalized.includes('joining renault group means being part of a pioneering automotive company')
    && normalized.includes('find your next job')
    && normalized.includes('view our offers')
    && normalized.includes('reknow university')
}

export const hasOfficialOffersSignal = (html) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return normalized.includes('find your next job')
    && normalized.includes('join our tech force and be part of the future of mobility')
    && normalized.includes('software architects, devops, cybersecurity engineers, scrum masters')
    && normalized.includes('working at renault group')
    && normalized.includes('recruitement privacy information policy')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createRenaultGroupScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Renault Group verified official homepage no longer matches the trusted first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Renault Group verified careers page no longer matches the trusted first-party surface')
    }

    const offersPage = await fetchPage(OFFERS_URL)
    if (offersPage.status !== 200 || !hasOfficialOffersSignal(offersPage.html)) {
      throw new Error('Renault Group verified offers page no longer matches the trusted first-party surface')
    }

    if (hasPublicJobsSignal(offersPage.html)) {
      throw new Error('Renault Group offers page now appears to expose a direct public jobs surface')
    }

    return []
  },
})

export const run = async (options = {}) => createRenaultGroupScraper().run(options)

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
