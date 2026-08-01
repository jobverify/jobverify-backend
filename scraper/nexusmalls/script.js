import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'nexusmalls'
export const HOMEPAGE_URL = 'https://www.nexusselecttrust.com/'
export const CAREERS_URL = 'https://www.nexusselecttrust.com/careers'
export const JOBS_URL = 'https://www.nexusselecttrust.com/jobs'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const HOMEPAGE_TITLE_PATTERN =
  /<title>\s*Nexus Select Trust\s*\|\s*Listed Real Estate Investment Trust\s*\(REIT\)\s*<\/title>/i
const HOMEPAGE_REIT_PATTERN =
  /India[’']s first publicly listed urban consumption\s+centre\s+Real Estate Investment Trust/i
const HOMEPAGE_ABOUT_PATTERN =
  /Nexus has emerged to be biggest retail real estate platform in India/i
const CAREER_LINK_PATTERN = /href=["']([^"']*(?:career|job|work-with-us|workwithus)[^"']*)["']/gi
const MISSING_ROUTE_PATTERN = /\b404\b|\bnot found\b|\bdoes not exist\b/i

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

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

  return HOMEPAGE_TITLE_PATTERN.test(page)
    && HOMEPAGE_REIT_PATTERN.test(page)
    && HOMEPAGE_ABOUT_PATTERN.test(page)
}

export const extractCareerLikeLinks = (html) => {
  const matches = String(html ?? '').matchAll(CAREER_LINK_PATTERN)
  return [...matches].map((match) => match[1])
}

export const hasMissingRouteSignal = ({ status, html }) => {
  const normalized = normalizeWhitespace(html).toLowerCase()

  return status === 404 && MISSING_ROUTE_PATTERN.test(normalized)
}

export const createNexusMallsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (!hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Nexus Malls homepage no longer matches the verified official public surface')
    }

    if (extractCareerLikeLinks(homepage.html).length > 0) {
      throw new Error('Nexus Malls homepage now appears to expose a public careers surface')
    }

    const routes = await Promise.all([
      fetchPage(CAREERS_URL),
      fetchPage(JOBS_URL),
    ])

    if (!routes.every(hasMissingRouteSignal)) {
      throw new Error('Nexus Malls verified missing careers routes changed')
    }

    return []
  },
})

export const run = async (options = {}) => createNexusMallsScraper().run(options)

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
