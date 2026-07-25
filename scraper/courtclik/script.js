import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'courtclik'
export const COMPANY = 'Courtclik'
export const HOMEPAGE_URL = 'https://www.courtclick.com/'
export const CAREERS_URL = 'https://www.courtclick.com/career'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const FETCH_TIMEOUT_MS = 15000

const createFetchTimeoutSignal = (timeoutMs = FETCH_TIMEOUT_MS) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) return undefined

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
  .replace(/&apos;|&rsquo;/gi, "'")
  .replace(/&mdash;|&ndash;/gi, '-')

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
    signal: createFetchTimeoutSignal(),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html).toLowerCase()

  return /<title>\s*Court Click:\s*India's Smartest Case Tracking App for Lawyers and Litigants\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.courtclick\.com\/?["']/i.test(markup)
    && /<meta[^>]+property=["']og:title["'][^>]+content=["']Court Click\s*-\s*Legal Case Management App for Lawyers\s*&\s*Litigants["']/i.test(markup)
    && text.includes('manage your legal journey anytime, anywhere')
    && text.includes("court click is a modern legal-tech platform designed to simplify how people track & manage court cases")
    && text.includes('digilaw legal software pvt ltd. doing business as court click')
}

export const hasOfficialCareersSignal = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html).toLowerCase()

  return /<title>\s*Careers at Court Click\s*-\s*Join Our Legal-Tech Team\s*\|\s*Court Click\s*<\/title>/i.test(markup)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/www\.courtclick\.com\/career["']/i.test(markup)
    && /<meta[^>]+name=["']description["'][^>]+content=["']Explore open roles at Court Click\.\s*Join our mission to transform India's legal-tech industry\.\s*See current openings and apply today\.["']/i.test(markup)
    && text.includes('build the future of legaltech')
    && text.includes('join a team building a more accessible, transparent, and efficient legal system for everyone.')
    && text.includes('open roles at court click')
    && text.includes('explore opportunities to grow, build, and make real impact.')
    && text.includes('digilaw legal software pvt ltd. doing business as court click')
}

export const hasZeroRolesEmptyState = (html) => {
  const markup = normalizeMarkup(html)
  const text = stripTags(html).toLowerCase()

  return markup.includes('class="open-roles"')
    && markup.includes('placeholder="Search for job roles"')
    && text.includes('no roles found')
}

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /darwinbox/i,
  /zohorecruit/i,
  /recruitcrm/i,
  /class=["'][^"']*\b(job-card|role-card|opening-card)\b/i,
  /<a\b[^>]*>\s*(apply now|apply here|view details|view opening|submit application)\s*<\/a>/i,
  /<button\b[^>]*>\s*(apply now|apply here|view details|submit application)\s*<\/button>/i,
]

export const hasUnexpectedPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(normalizeMarkup(html)))

export const createCourtclikScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Courtclik verified official homepage no longer matches the verified first-party surface')
    }

    const careersPage = await fetchPage(CAREERS_URL)

    if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
      throw new Error('Courtclik verified official careers page no longer matches the verified first-party surface')
    }

    if (!hasZeroRolesEmptyState(careersPage.html) || hasUnexpectedPublicJobsSignal(careersPage.html)) {
      throw new Error('Courtclik careers page no longer matches the verified zero-openings surface')
    }

    return []
  },
})

export const run = async (options = {}) => createCourtclikScraper().run(options)

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
