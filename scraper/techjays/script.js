export const SOURCE = 'techjays'
export const COMPANY = 'Techjays'
export const HOMEPAGE_URL = 'https://www.techjays.com/'
export const CAREERS_URL = 'https://www.techjays.com/careers'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Techjays',
  adapter: 'script',
  modulePath: '../techjays/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-redirect-validation',
  extractionStrategy: 'verified-homepage-without-careers-link+verified-careers-route-redirect-to-about',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'techjays.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.techjays.com/ did not expose a public careers or jobs link, and that https://www.techjays.com/careers currently redirected candidates to /about instead of a public openings page.',
  dryRunFile: 'techjays/jobs.json',
}

export const hasOfficialHomepageSignal = (html) => {
  const page = String(html ?? '')
  return /Techjays \| The AI Reimagination Company/i.test(page)
    && /The AI Reimagination Company/i.test(page)
}

export const hasPublicCareersLink = (html) =>
  /href=["'][^"']*(careers|career|jobs|job)[^"']*["']/i.test(String(html ?? ''))

export const isExpectedCareersRedirect = (response) => {
  const status = Number(response?.status)
  const location = String(response?.headers?.location ?? '').trim()
  return status === 308 && location === '/about'
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

export const defaultFetchPage = async (url, {
  fetchImpl = fetch,
  timeoutMs = 15000,
} = {}) => {
  const response = await fetchImpl(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify scraper)',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    redirect: url === CAREERS_URL ? 'manual' : 'follow',
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
    headers: {
      location: response.headers?.get?.('location') || '',
    },
  }
}

export const run = async ({ fetchPage = defaultFetchPage } = {}) => {
  const homepage = await fetchPage(HOMEPAGE_URL)

  if (!hasOfficialHomepageSignal(homepage?.html) || hasPublicCareersLink(homepage?.html)) {
    throw new Error('Techjays verified homepage no-public-careers surface changed materially')
  }

  const careersResponse = await fetchPage(CAREERS_URL)
  if (!isExpectedCareersRedirect(careersResponse)) {
    throw new Error('Techjays verified careers redirect changed materially')
  }

  return []
}
