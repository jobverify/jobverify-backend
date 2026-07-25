export const SOURCE = 'vdart'
export const COMPANY = 'VDart'
export const HOMEPAGE_URL = 'https://www.vdart.com/'
export const CAREERS_URL = 'https://vdart.jobs.net/'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'VDart',
  adapter: 'script',
  modulePath: '../vdart/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers-blocked',
  countryFilter: 'India',
  paginationStrategy: 'jobsnet-home-shell-plus-browser-and-cli-access-validation',
  extractionStrategy: 'verified-jobsnet-shell+verified-talent-network-copy+live-403-blocked-surface+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'vdart.jobs.net',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://vdart.jobs.net/ was the branded VDart public jobs shell, but the surface still required JavaScript while live direct requests returned HTTP 403 even when retried with a browser user agent, so this provider remains fail-closed until a trustworthy fetchable public jobs listing is confirmed.',
  dryRunFile: 'vdart/jobs.json',
}

export const hasExpectedShellSignals = (html) => {
  const page = String(html ?? '')
  return /Find a Job \| vdart\.jobs\.net/i.test(page)
    && /Careers at Vdart Technologies Pvt\. Ltd\./i.test(page)
    && /This site requires JavaScript/i.test(page)
    && /Talent Network/i.test(page)
}

export const isBlockedJobsSurface = (response) => Number(response?.status) === 403

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
    redirect: 'follow',
    signal: createTimeoutSignal(timeoutMs),
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const run = async ({ fetchPage = defaultFetchPage } = {}) => {
  const shellPage = await fetchPage(CAREERS_URL)
  if (!hasExpectedShellSignals(shellPage?.html)) {
    throw new Error('VDart verified public jobs shell changed materially')
  }

  const jobsPage = await fetchPage(`${CAREERS_URL}jobs`)
  if (!isBlockedJobsSurface(jobsPage)) {
    throw new Error('VDart blocked jobs surface changed materially')
  }

  return []
}
