import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'manatecelectronics'
export const COMPANY = 'Manatec Electronics Private Limited'
export const HOMEPAGE_URL = 'https://manatec.in/'
export const CAREERS_URL = 'https://manatec.in/career/'
export const PAGE_SITEMAP_URL = 'https://manatec.in/wp-sitemap-posts-page-1.xml'
export const MISSING_ROUTE_URL = 'https://manatec.in/join-us'
export const EXPECTED_DEPARTMENTS = [
  'Commercial and Despatch',
  'CSD',
  'Engineering',
  'Exports Marketing',
  'Domestic Marketing',
  'Finance',
  'HR & Admin',
  'Pricing',
  'Production',
  'Purchase and vendor',
  'Quality',
  'R & D',
  'Stores',
  'Testing and Assembling',
  'Trading',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&#(\d+);/g, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 10)))
  .replace(/&#x([0-9a-f]+);/gi, (_, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;|&#038;/gi, '&')
  .replace(/&#8211;|&ndash;/gi, '-')
  .replace(/&#8217;|&rsquo;|&#039;/gi, "'")
  .replace(/&quot;|&#8220;|&#8221;/gi, '"')

const normalizeWhitespace = (value) => decodeHtmlEntities(String(value ?? ''))
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim() || null

const stripTags = (value) => String(value ?? '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<(br|\/p|\/div|\/section|\/article|\/li|\/ul|\/ol|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<(p|div|section|article|li|ul|ol|h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')

const normalizeVisibleText = (value) => normalizeWhitespace(stripTags(value)) || ''

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

const isConnectTimeoutFetchError = (error) => {
  const seen = new Set()
  let current = error
  let sawFetchFailed = false
  let sawConnectTimeout = false

  while (current && !seen.has(current)) {
    seen.add(current)

    const message = String(current?.message ?? current)
    const causeCode = String(current?.code ?? '')
    if (/fetch failed/i.test(message)) sawFetchFailed = true
    if (/UND_ERR_CONNECT_TIMEOUT/i.test(causeCode)) sawConnectTimeout = true

    current = current?.cause
  }

  return sawFetchFailed && sawConnectTimeout
}

const toWwwFallbackUrl = (value) => {
  const url = new URL(value)
  if (url.hostname.startsWith('www.')) {
    return null
  }

  url.hostname = `www.${url.hostname}`
  return url.toString()
}

export const fetchPageWithWwwFallback = async (url, {
  fetchImpl = fetch,
  timeoutMs = 30000,
} = {}) => {
  const fetchOnce = async (targetUrl) => {
    const response = await fetchImpl(targetUrl, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: createTimeoutSignal(timeoutMs),
    })

    return {
      status: response.status,
      url: response.url,
      html: await response.text(),
    }
  }

  try {
    return await fetchOnce(url)
  } catch (error) {
    const fallbackUrl = toWwwFallbackUrl(url)
    if (!fallbackUrl || !isConnectTimeoutFetchError(error)) {
      throw error
    }

    return fetchOnce(fallbackUrl)
  }
}

const defaultFetchPage = (url) => fetchPageWithWwwFallback(url)

const hasVerifiedCareersLink = (html) =>
  /href=["']https?:\/\/manatec\.in\/career\/["']|href=["']\/career\/["']/i.test(String(html ?? ''))

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()

  return /<title>\s*MANATEC\s*(?:&#8211;|&ndash;|–|-)\s*ALIGNED TO EXCELLENCE\s*<\/title>/i.test(page)
    && text.includes('manatec group of companies')
    && text.includes('trusted in 70+ countries')
    && text.includes('garage equipment')
    && text.includes('we work for you since 1987')
    && text.includes('industrial shaft alignment systems')
    && text.includes('automotive aftermarket equipment industry in 1991')
    && hasVerifiedCareersLink(page)
}

export const hasVerifiedPageSitemapSignal = (xml) => {
  const page = String(xml ?? '')
  return /<urlset\b/i.test(page)
    && /<loc>\s*https:\/\/manatec\.in\/\s*<\/loc>/i.test(page)
    && /<loc>\s*https:\/\/manatec\.in\/career\/\s*<\/loc>/i.test(page)
  }

export const extractDepartmentOptions = (html) => [
  ...String(html ?? '').matchAll(/<option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi),
].map((match) => normalizeWhitespace(match[2] || match[1])).filter(Boolean)

export const hasApplicationOnlyCareersSignal = (html) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()
  const departments = extractDepartmentOptions(page)

  return /<title>\s*Career\s*(?:&#8211;|&ndash;|–|-)\s*MANATEC\s*<\/title>/i.test(page)
    && text.includes('opportunities')
    && text.includes('at manatec, we believe that our greatest asset is our people.')
    && text.includes('we are always on the lookout for passionate, innovative, and talented individuals')
    && text.includes('application')
    && text.includes('upload resume / cv')
    && text.includes('interested in working with us?')
    && text.includes('hrdmel@manatec.in')
    && departments.length === EXPECTED_DEPARTMENTS.length
    && departments.every((department, index) => department === EXPECTED_DEPARTMENTS[index])
    && !/current openings|open positions|job id|requisition|vacancy\s*:|view details|job description|apply now/i.test(text)
}

export const isVerifiedMissingRoute = ({ status, html } = {}) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()

  return status === 404
    && /<title>\s*Page not found\s*(?:&#8211;|&ndash;|–|-)\s*MANATEC\s*<\/title>/i.test(page)
    && text.includes('404')
    && text.includes('opps! the page you requested was not found.')
    && text.includes('back to homepage')
}

const BLOCKED_PUBLIC_JOB_PATTERN =
  /current openings|open positions|job id|requisition|vacancy\s*:|view details|job description|apply now/i

export const isVerifiedBlockedShell = ({ status, html } = {}) => {
  const page = String(html ?? '')
  const text = normalizeVisibleText(page).toLowerCase()

  return status === 403
    && /<title>\s*403 Forbidden\s*<\/title>/i.test(page)
    && text.includes('403 forbidden')
    && text.includes("you don't have permission to access")
    && text.includes('a 403 forbidden error was encountered while trying to use an errordocument to handle the request.')
    && !BLOCKED_PUBLIC_JOB_PATTERN.test(text)
}

export const createManatecElectronicsScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)
    const pageSitemap = await fetchPage(PAGE_SITEMAP_URL)
    const careersPage = await fetchPage(CAREERS_URL)
    const missingRoute = await fetchPage(MISSING_ROUTE_URL)

    if ([homepage, pageSitemap, careersPage, missingRoute].every(isVerifiedBlockedShell)) {
      return []
    }

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('Manatec Electronics homepage no longer matches the verified official public site')
    }

    if (pageSitemap.status !== 200 || !hasVerifiedPageSitemapSignal(pageSitemap.html)) {
      throw new Error('Manatec Electronics page sitemap no longer matches the verified official public structure')
    }

    if (careersPage.status !== 200 || !hasApplicationOnlyCareersSignal(careersPage.html)) {
      throw new Error('Manatec Electronics careers page no longer matches the verified application-only public surface')
    }

    if (!isVerifiedMissingRoute(missingRoute)) {
      throw new Error('Manatec Electronics missing-route behavior changed materially')
    }

    return []
  },
})

export const run = async (options = {}) => createManatecElectronicsScraper().run(options)

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
