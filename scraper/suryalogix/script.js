import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'suryalogix'
export const COMPANY = 'SuryaLogix'
export const HOMEPAGE_URL = 'https://suryalogix.com/'
export const CAREERS_URL = 'https://suryalogix.com/career-opportunities/'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&apos;|&rsquo;/gi, "'")
  .replace(/&ndash;|&mdash;/gi, '-')

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeMarkup = (value) => normalizeWhitespace(
  decodeHtmlEntities(value)
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-'),
)

const stripTags = (value) => normalizeWhitespace(
  decodeHtmlEntities(String(value ?? ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u2019/g, "'")
    .replace(/[\u2013\u2014]/g, '-'),
)

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
  const markup = normalizeMarkup(html)
  const text = stripTags(html)

  return /<title>\s*SuryaLogix\s*\|\s*Monitoring\s*&\s*Controlling with AI\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/suryalogix\.com\/["']/i.test(markup)
    && /href=["'][^"']*\/career-opportunities\/["']/i.test(markup)
    && text.includes('SMART | RELIABLE | SUSTAINABLE')
    && (
      text.includes('Smart Renewable Energy Monitoring & Control Solutions')
      || /Smart Renewable Energy monitoring\s*&\s*Control\s*Solutions/i.test(text)
    )
    && text.includes('Trusted Across 30+ Countries')
    && (
      text.includes('Welcome to SuryaLogix Innovative Energy Solutions')
      || text.includes('Engineering the Future of Renewable Intelligence')
    )
    && text.includes('sales@suryalogix.com')
  }

export const hasOfficialCareersSignal = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html)

  return /<title>\s*Join SuryaLogix\s*\|\s*Renewable Energy Careers\s*&\s*Opportunities\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/suryalogix\.com\/career-opportunities\/["']/i.test(markup)
    && text.includes('CAREERS AT SURYALOGIX')
    && text.includes('Work with us')
    && text.includes('More Than Just A Job')
    && text.includes('Career In Suryalogix')
    && text.includes('We Believe in People, Purpose & Progress')
    && text.includes('At SuryaLogix, we believe great work is built by great teams.')
    && text.includes('Application Form')
  }

export const hasApplicationFormSurface = (html) => {
  const text = stripTags(html)

  return text.includes('Application Form')
    && text.includes('Your name')
    && text.includes('Your email')
    && text.includes('Phone')
    && text.includes('Applying for Position of')
    && text.includes('Upload Your Resume')
    && text.includes('Your message (optional)')
  }

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bcurrent vacancies\b/i,
  /\bopen positions\b/i,
  /\bopen roles\b/i,
  /\bjob openings\b/i,
  /\bvacancies\b/i,
  /\bview details\b/i,
  /\bjob description\b/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /recruitcrm/i,
  /zohorecruit/i,
  /linkedin\.com\/jobs/i,
  /\/jobs\//i,
]

export const hasUnexpectedPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizeMarkup(html)))

export const createSuryaLogixScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('SuryaLogix verified official homepage no longer matches the verified first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('SuryaLogix verified official careers page no longer matches the verified first-party surface')
    }

    if (!hasApplicationFormSurface(careersPage.html) || hasUnexpectedPublicJobsSignal(careersPage.html)) {
      throw new Error('SuryaLogix careers page no longer matches the verified non-listing application form surface')
    }

    return []
  },
})

export const run = async (options = {}) => createSuryaLogixScraper().run(options)

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
