export const SOURCE = 'vecv'
export const COMPANY = 'VE Commercial Vehicles'
export const HOMEPAGE_URL = 'https://www.vecv.in/'
export const CAREERS_ROUTE_URLS = [
  'https://www.vecv.in/careers',
  'https://www.vecv.in/careers/',
]

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
  /recruitcrm/i,
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

const isSameOfficialDomain = (value) => {
  try {
    return new URL(value || HOMEPAGE_URL).hostname === 'www.vecv.in'
  } catch {
    return false
  }
}

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

  return normalized.includes('ve commercial vehicles')
    && normalized.includes('operational since july 2008')
    && normalized.includes('volvo group')
    && normalized.includes('eicher motors')
}

export const hasPublicJobsSignal = (html) =>
  PUBLIC_JOBS_SIGNAL_PATTERNS.some((pattern) => pattern.test(String(html ?? '')))

export const isBlockedOrMissingCareersRoute = (page = {}) => {
  if (!isSameOfficialDomain(page.url || HOMEPAGE_URL)) {
    return false
  }

  if (hasPublicJobsSignal(page.html)) {
    return false
  }

  const normalized = normalizeWhitespace(page.html).toLowerCase()
  return Number(page.status) === 403
    || Number(page.status) === 404
    || normalized.includes('forbidden')
    || hasOfficialHomepageSignal(page.html)
}

export const createVecvScraper = () => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const homepage = await fetchPage(HOMEPAGE_URL)

    if (homepage.status !== 200 || !hasOfficialHomepageSignal(homepage.html)) {
      throw new Error('VECV verified official homepage no longer matches the known public surface')
    }

    if (hasPublicJobsSignal(homepage.html)) {
      throw new Error('VECV homepage now appears to expose a public jobs surface')
    }

    for (const careersRouteUrl of CAREERS_ROUTE_URLS) {
      const careersRoute = await fetchPage(careersRouteUrl)

      if (!isBlockedOrMissingCareersRoute(careersRoute)) {
        throw new Error('VECV careers routes changed materially or now expose public jobs')
      }
    }

    return []
  },
})

export const run = async (options = {}) => createVecvScraper().run(options)
