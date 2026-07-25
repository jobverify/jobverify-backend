import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'intellectyx'
export const COMPANY = 'Intellectyx'
export const HOMEPAGE_URL = 'https://www.intellectyx.com/'
export const CAREERS_URL = 'https://www.intellectyx.com/careers/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_SIGNALS = [
  /<title>\s*Innovative Generative AI, Data, and Digital Solutions \| Intellectyx\s*<\/title>/i,
  /href=["'][^"']*\/careers\/?["']/i,
  /we(?:'|&apos;|&rsquo;)?re hiring/i,
  /top-tier talent/i,
]

const CAREERS_SIGNALS = [
  /<title>\s*Careers\s*-\s*Intellectyx\s*<\/title>/i,
  /One Team - One Company - Intellectyx/i,
  /Discover new opportunities in data and analytics consulting\./i,
  /Send Your Resume/i,
  /recruitment@intellectyx\.com/i,
]

const PUBLIC_JOB_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bsearch jobs\b/i,
  /\bjob description\b/i,
  /\bview jobs\b/i,
  /\bapply now\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
]

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  return {
    ok: response.ok,
    status: response.status,
    url: response.url,
    text: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) =>
  HOMEPAGE_SIGNALS.every((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersSignal = (html) =>
  CAREERS_SIGNALS.every((pattern) => pattern.test(String(html ?? '')))

export const pageExposesPublicJobListings = (html) =>
  PUBLIC_JOB_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const createIntellectyxScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    if (!homepage.ok || !hasOfficialHomepageSignal(homepage.text)) {
      throw new Error('The official Intellectyx homepage no longer matches the verified public surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)
    if (!careersPage.ok || !hasOfficialCareersSignal(careersPage.text)) {
      throw new Error('The official Intellectyx careers page no longer matches the verified resume-only surface')
    }

    if (pageExposesPublicJobListings(careersPage.text)) {
      throw new Error('The official Intellectyx careers page appears to expose public job listings')
    }

    return []
  },
})

export const run = async (options = {}) => createIntellectyxScraper().run(options)

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
