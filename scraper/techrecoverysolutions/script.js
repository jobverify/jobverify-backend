import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'techrecoverysolutions'
export const COMPANY = 'Techcovery Solutions'
export const HOMEPAGE_URL = 'https://techcovery.in/'
export const ABOUT_URL = 'https://techcovery.in/about-us/'
export const CONTACT_URL = 'https://techcovery.in/contact/'
export const NO_JOBS_ROUTE_URLS = [
  'https://techcovery.in/careers',
  'https://techcovery.in/careers/',
  'https://techcovery.in/career',
  'https://techcovery.in/career/',
  'https://techcovery.in/jobs',
  'https://techcovery.in/jobs/',
  'https://techcovery.in/join-us',
  'https://techcovery.in/join-us/',
  'https://techcovery.in/current-openings',
  'https://techcovery.in/current-openings/',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const BASIC_ENTITY_MAP = new Map([
  ['&nbsp;', ' '],
  ['&amp;', '&'],
  ['&#38;', '&'],
  ['&quot;', '"'],
  ['&#34;', '"'],
  ['&#39;', "'"],
  ['&apos;', "'"],
  ['&#8211;', '-'],
  ['&#8212;', '-'],
  ['&#8216;', "'"],
  ['&#8217;', "'"],
])

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcareers?\b/i,
  /\bcurrent openings?\b/i,
  /\bopen positions?\b/i,
  /\bjob openings?\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bapply now\b/i,
  /\bjoin us\b/i,
  /href=["'][^"']*\/(?:careers?|jobs?|join-us|current-openings)(?:\/|["'#?])/i,
  /jobs\.lever\.co/i,
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /ashbyhq\.com/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /smartrecruiters/i,
  /jobvite/i,
  /freshteam/i,
  /darwinbox/i,
  /zohorecruit/i,
  /recruitcrm/i,
]

const decodeBasicEntities = (value) => {
  let decoded = String(value ?? '')

  for (const [entity, replacement] of BASIC_ENTITY_MAP.entries()) {
    decoded = decoded.replace(new RegExp(entity, 'gi'), replacement)
  }

  return decoded
}

const normalizeWhitespace = (value) => decodeBasicEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const extractVisibleText = (html) => normalizeWhitespace(
  String(html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' '),
)

const isSameOfficialDomain = (value) => {
  try {
    const hostname = new URL(String(value ?? HOMEPAGE_URL)).hostname.toLowerCase()
    return hostname === 'techcovery.in' || hostname === 'www.techcovery.in'
  } catch {
    return false
  }
}

const createTimeoutSignal = (timeoutMs) => {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return undefined
  }

  if (typeof AbortSignal?.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs)
  }

  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const visibleText = extractVisibleText(page)

  return /<title>\s*Techcovery\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/techcovery\.in\/["']/i.test(page)
    && /href=["'](?:https?:\/\/techcovery\.in\/about-us\/|\/about-us\/)["']/i.test(page)
    && /href=["'](?:https?:\/\/techcovery\.in\/contact\/|\/contact\/)["']/i.test(page)
    && visibleText.includes('WHY TECHCOVERY?')
    && visibleText.includes('BLOGS')
    && visibleText.includes('COURSES')
    && visibleText.includes('EVENTS')
    && visibleText.includes('CONTACT US')
}

export const hasOfficialAboutSignal = (html) => {
  const page = String(html ?? '')
  const visibleText = extractVisibleText(page)

  return /<title>\s*About Us\s*(?:&#8211;|–|-)\s*Techcovery\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/techcovery\.in\/about-us\/["']/i.test(page)
    && visibleText.includes('About Us')
    && visibleText.includes('Techcovery has expertise in enterprise consulting and training in niche digital technologies.')
    && visibleText.includes('We work closely with various organizations to fulfill needs for upskilling and reskilling the workforce to take on more advanced work in various technologies.')
}

export const hasOfficialContactSignal = (html) => {
  const page = String(html ?? '')
  const visibleText = extractVisibleText(page)

  return /<title>\s*Contact Us\s*(?:&#8211;|–|-)\s*Techcovery\s*<\/title>/i.test(page)
    && /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/techcovery\.in\/contact\/["']/i.test(page)
    && visibleText.includes('Contact Us')
    && visibleText.includes('Intide Space, BNR Complex,2nd Floor, J.P Nagar, 7th phase Near Brigade Millenium, Puttenahalli, Bangalore-560078, Karnataka')
}

export const hasUnexpectedPublicJobsSignal = (html) => {
  const haystacks = [String(html ?? ''), extractVisibleText(html)]

  return PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) =>
    haystacks.some((haystack) => pattern.test(haystack)),
  )
}

export const isVerifiedMissingJobsRoute = ({ status, url, html }) =>
  Number(status) === 404
  && isSameOfficialDomain(url)
  && !hasUnexpectedPublicJobsSignal(html)

export const createTechcoverySolutionsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Techcovery Solutions verified homepage no longer matches the known first-party surface')
    }

    if (hasUnexpectedPublicJobsSignal(homepage.html)) {
      throw new Error('Techcovery Solutions homepage now exposes public jobs')
    }

    const aboutPage = await fetchPage(ABOUT_URL)

    if (aboutPage.status !== 200 || !hasOfficialAboutSignal(aboutPage.html)) {
      throw new Error('Techcovery Solutions verified about page no longer matches the known first-party surface')
    }

    if (hasUnexpectedPublicJobsSignal(aboutPage.html)) {
      throw new Error('Techcovery Solutions about page now exposes public jobs')
    }

    const contactPage = await fetchPage(CONTACT_URL)

    if (contactPage.status !== 200 || !hasOfficialContactSignal(contactPage.html)) {
      throw new Error('Techcovery Solutions verified contact page no longer matches the known first-party surface')
    }

    if (hasUnexpectedPublicJobsSignal(contactPage.html)) {
      throw new Error('Techcovery Solutions contact page now exposes public jobs')
    }

    for (const routeUrl of NO_JOBS_ROUTE_URLS) {
      const routePage = await fetchPage(routeUrl)

      if (!isVerifiedMissingJobsRoute(routePage)) {
        throw new Error('Techcovery Solutions missing jobs routes changed materially')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createTechcoverySolutionsScraper().run(options)

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
