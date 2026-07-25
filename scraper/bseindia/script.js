import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'bseindia'
export const COMPANY = 'BSE India'
export const CAREERS_URL = 'https://www.bseindia.com/static/about/careers'
export const SITEMAP_URL = 'https://www.bseindia.com/sitemap.xml'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_ROUTE_PATTERN = /\/(?:careers?|jobs?|openings?|vacancies?)(?:\/|$)/i
const ATS_SIGNAL_PATTERNS = [
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /myworkdayjobs/i,
  /workdayjobs/i,
  /ashbyhq\.com/i,
  /smartrecruiters/i,
  /darwinbox/i,
  /freshteam/i,
  /workable/i,
  /recruitee/i,
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/\s+/g, ' ')
  .trim()

const hasUnexpectedAtsSignal = (value) =>
  ATS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(value ?? '')))

export const extractBundleUrl = (html) => {
  const match = String(html ?? '').match(/<script[^>]+src=["']([^"']*assets\/includenew\/js\/main-[^"']+\.js)["']/i)
  if (!match?.[1]) return null

  try {
    return new URL(match[1], CAREERS_URL).toString()
  } catch {
    return null
  }
}

export const hasOfficialCareersShell = (html) => {
  const page = String(html ?? '')
  const canonical = normalizeWhitespace(page.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] ?? '')
  const hasCurrentAngularShell =
    /<title[^>]*>[\s\S]*BSE(?:\s*SENSEX|\s*\(formerly Bombay Stock Exchange\))[\s\S]*<\/title>/i.test(page)
    && /<base\s+href=["']\/["']/i.test(page)

  return (canonical === CAREERS_URL || hasCurrentAngularShell)
    && /<app-root\b[^>]*>/i.test(page)
    && extractBundleUrl(page) != null
    && !hasUnexpectedAtsSignal(page)
}

export const hasVerifiedSitemapSignal = (xml) => {
  const text = normalizeWhitespace(xml)
  return text.includes('<loc>https://www.bseindia.com/static/about/careers</loc>')
    && text.includes('<loc>https://www.bseindia.com/markets/jobprocessstatus</loc>')
}

export const sitemapExposesPublicJobsRoute = (xml) =>
  [...String(xml ?? '').matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
    .map((match) => normalizeWhitespace(match[1]))
    .some((url) => {
      if (!url) return false
      if (url === CAREERS_URL) return false
      if (/\/markets\/jobprocessstatus\/?$/i.test(url)) return false
      return PUBLIC_JOBS_ROUTE_PATTERN.test(url)
    })

export const hasOfficialBundleSignal = (bundleJs) => {
  const script = String(bundleJs ?? '')
  const normalized = normalizeWhitespace(script)

  return normalized.includes('/static/about/careers')
    && normalized.includes('Careers at BSE')
    && normalized.includes('careers@bseindia.com')
    && !hasUnexpectedAtsSignal(script)
}

const decodeBundleText = (value) => String(value ?? '')
  .replace(/\\u([\da-f]{4})/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeOpeningTitle = (value) => {
  const normalized = decodeBundleText(value)
    .replace(/^Hiring\s+Post\s*-\s*/i, '')
    .replace(/^Hiring\s+Finance\s*:\s*/i, '')
    .trim()

  return normalized || null
}

const deriveDepartment = (title) => {
  if (/financial planning|finance/i.test(title)) return 'Others'
  if (/online surveillance|investigation|listing compliance/i.test(title)) return 'Regulatory'
  return null
}

const slugify = (value) => String(value ?? '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const extractCurrentOpeningsFromBundle = (bundleJs, {
  scrapedAt = new Date().toISOString(),
} = {}) => {
  const script = String(bundleJs ?? '')
  const seen = new Set()
  const titles = [
    ...script.matchAll(/["'`]Hiring(?:\s+Post\s*-\s*|\s+Finance\s*:\s*)([^"'`]+)["'`]/gi),
  ]
    .map((match) => normalizeOpeningTitle(match[0].slice(1, -1)))
    .filter(Boolean)

  return titles
    .map((title) => {
      const dedupeKey = title.toLowerCase()
      if (seen.has(dedupeKey)) return null
      seen.add(dedupeKey)

      const jobId = `${SOURCE}-${slugify(title)}`

      return {
        title,
        company: COMPANY,
        department: deriveDepartment(title),
        location: 'India',
        city: 'Remote',
        country: 'India',
        jobId,
        requisitionId: jobId,
        sourceUrl: CAREERS_URL,
        applyUrl: 'mailto:careers@bseindia.com',
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: null,
        closingDate: null,
        jobDescription: null,
        remoteStatus: null,
        source: SOURCE,
        link: 'mailto:careers@bseindia.com',
        scrapedAt,
      }
    })
    .filter(Boolean)
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: 'follow',
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.text()
}

export const createBseIndiaScraper = () => ({
  async run({ fetchText = defaultFetchText } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)
    if (!hasOfficialCareersShell(careersHtml)) {
      throw new Error('BSE India careers shell no longer matches the verified first-party public surface')
    }

    const sitemapXml = await fetchText(SITEMAP_URL)
    if (!hasVerifiedSitemapSignal(sitemapXml)) {
      throw new Error('BSE India sitemap no longer matches the verified first-party public careers surface')
    }

    if (sitemapExposesPublicJobsRoute(sitemapXml)) {
      throw new Error('BSE India sitemap now exposes a public jobs route; implement a real scraper after re-verifying the first-party jobs surface')
    }

    const bundleUrl = extractBundleUrl(careersHtml)
    const bundleJs = await fetchText(bundleUrl)
    if (!hasOfficialBundleSignal(bundleJs)) {
      throw new Error('BSE India frontend bundle no longer matches the verified first-party careers shell')
    }

    return extractCurrentOpeningsFromBundle(bundleJs)
  },
})

export const run = async (options = {}) => createBseIndiaScraper().run(options)

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
