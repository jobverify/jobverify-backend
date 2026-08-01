import { createBrowserFetchSession } from '../../scraper-support/shared/browserFetch.js'

export const SOURCE = 'balajitelefilms'
export const COMPANY = 'Balaji Telefilms'
export const HOMEPAGE_URL = 'https://www.balajitelefilms.com/'
export const CAREERS_URL = 'https://www.balajitelefilms.com/career-opportunity.php'
export const MISSING_ROUTE_URLS = [
  'https://www.balajitelefilms.com/careers',
  'https://www.balajitelefilms.com/career',
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const PUBLIC_JOBS_SIGNAL_PATTERNS = [
  /\bcurrent openings\b/i,
  /\bopen positions\b/i,
  /\bjob openings\b/i,
  /\bvacanc(?:y|ies)\b/i,
  /\bjob description\b/i,
  /\bapply now\b/i,
  /\bapply here\b/i,
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
]

const stripHtmlComments = (value) =>
  String(value ?? '').replace(/<!--[\s\S]*?-->/g, ' ')

const normalizeWhitespace = (value) =>
  stripHtmlComments(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeText = (value) => normalizeWhitespace(value).toLowerCase()

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
    redirect: 'follow',
    signal: createTimeoutSignal(15000),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

const isBrowserFallbackError = (error) =>
  /HTTP (?:403|429)\b|fetch failed|timed out|timeout|could not connect|und_err_connect_timeout|ssl\/tls secure channel|econnreset|unable to/i
    .test(String(error?.message ?? error ?? ''))

export const extractApplicationEmail = (html) => {
  const match = String(html ?? '').match(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  )

  return match?.[0]?.toLowerCase() ?? null
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Balaji Telefilms(?:\s+Limited\s*:\s*Television,\s*Motion Pictures)?\s*<\/title>/i.test(page)
    && hasVerifiedCareersLink(page)
    && normalized.includes('balaji telefilms')
}

export const hasVerifiedCareersLink = (html) =>
  /href=["'](?:https:\/\/www\.balajitelefilms\.com\/)?career-opportunity\.php["']/i.test(String(html ?? ''))

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return /<title>\s*Balaji Telefilms(?:\s+Limited\s*:\s*Television,\s*Motion Pictures)?\s*<\/title>/i.test(page)
    && hasVerifiedCareersLink(page)
    && normalized.includes('for a career with balaji telefilms ltd')
    && normalized.includes('careers@balajitelefilms.com')
}

export const hasEmailOnlyCareersSignal = (html) => {
  const normalized = normalizeText(html)

  return extractApplicationEmail(html) === 'careers@balajitelefilms.com'
    && normalized.includes('please send your resume to careers@balajitelefilms.com')
}

export const hasUnexpectedPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(stripHtmlComments(html)))

export const isVerifiedMissingRoute = ({ status, html }) => {
  const page = String(html ?? '')
  const normalized = normalizeText(page)

  return status === 404
    && (
      (
        /<title>\s*404 Not Found\s*<\/title>/i.test(page)
        && normalized.includes('not found')
        && normalized.includes('the requested url was not found on this server')
      )
      || (
        /id=["']sk-loader["']/i.test(page)
        && /_skz_pid/i.test(page)
      )
    )
}

export const createBalajiTelefilmsScraper = () => ({
  async run({ fetchPage = defaultFetchPage, fetchBrowserPage } = {}) {
    let browserSession = null

    const getBrowserSession = async () => {
      if (!browserSession) {
        browserSession = await createBrowserFetchSession({ userAgent: USER_AGENT })
      }

      return browserSession
    }

    const browserPageFetcher = fetchBrowserPage || (async (url) => {
      const session = await getBrowserSession()
      return session.fetchPage(url)
    })

    const fetchVerifiedPage = async (url) => {
      try {
        return await fetchPage(url)
      } catch (error) {
        if (!isBrowserFallbackError(error)) {
          throw error
        }

        return browserPageFetcher(url)
      }
    }

    try {
      const homepage = await fetchVerifiedPage(HOMEPAGE_URL)

      if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
        throw new Error('Balaji Telefilms verified official homepage no longer matches the known first-party surface')
      }

      if (!hasVerifiedCareersLink(homepage.html)) {
        throw new Error('Balaji Telefilms homepage no longer links to the verified first-party careers page')
      }

      if (hasUnexpectedPublicJobsSignal(homepage.html)) {
        throw new Error('Balaji Telefilms homepage now appears to expose a public jobs surface')
      }

      const careersPage = await fetchVerifiedPage(CAREERS_URL)

      if (careersPage.status !== 200 || !hasOfficialCareersSignal(careersPage.html)) {
        throw new Error('Balaji Telefilms verified first-party careers surface no longer matches the known public page')
      }

      if (!hasEmailOnlyCareersSignal(careersPage.html)) {
        throw new Error('Balaji Telefilms verified email-only careers surface changed')
      }

      if (hasUnexpectedPublicJobsSignal(careersPage.html)) {
        throw new Error('Balaji Telefilms verified email-only careers surface drifted to a public jobs surface')
      }

      for (const missingRouteUrl of MISSING_ROUTE_URLS) {
        const missingRoute = await fetchVerifiedPage(missingRouteUrl)

        if (!isVerifiedMissingRoute(missingRoute)) {
          throw new Error('Balaji Telefilms missing jobs routes changed materially')
        }
      }

      return []
    } finally {
      if (browserSession) {
        await browserSession.close()
      }
    }
  },
})

export const run = async (options = {}) => createBalajiTelefilmsScraper().run(options)
