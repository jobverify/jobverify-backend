import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCE = 'srmgroupofcompanies'
export const COMPANY = 'SRM Group of Companies'
export const GROUP_SURFACE_URL = 'https://www.srmtech.com/who-we-are/'
export const CAREERS_PAGE_URL = 'https://www.srmtech.com/careers/'
export const CAREERS_HANDOFF_URL = 'https://careers.srmtech.com/jobs/Careers'
export const OFFICIAL_SURFACE_URLS = [
  GROUP_SURFACE_URL,
  CAREERS_PAGE_URL,
  CAREERS_HANDOFF_URL,
]

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
const REQUEST_TIMEOUT_MS = 15000

const GROUP_SURFACE_SIGNAL_PATTERNS = [
  /<title>\s*About Us \| Our Markets \| Our Partners \| SRM Technologies\s*<\/title>/i,
  /Founded in 1998 as part of the SRM Group/i,
  /About SRM Group/i,
  /A billion-dollar conglomerate with a formidable presence in the fields of education,\s*transport,\s*engineering,\s*hospitality,\s*infotainment and healthcare\./i,
  /SRM Group is known for its integrity,\s*ethical practice and transparency/i,
  /Hospitality &amp; Transport|Hospitality & Transport/i,
  /Healthcare\s*\|\s*[“"]Advanced Tertiary Healthcare for a Healthier Tomorrow[”"]/i,
]

const CAREERS_PAGE_SIGNAL_PATTERNS = [
  /<title>\s*Careers \| Work Culture \| SRM Technologies\s*<\/title>/i,
  /Become A Part Of Our Growth Journey/i,
  /Featured Roles/i,
  /href=["']https:\/\/careers\.srmtech\.com\/jobs\/Careers["']/i,
  /Why SRM Tech\?/i,
  /Join a Certified Great Place to Work!/i,
  /View Open Positions/i,
]

const EXPECTED_HANDOFF_STEPS = [
  {
    matchesUrl: (value) => value === CAREERS_HANDOFF_URL,
    status: 302,
    locationPattern: /^https:\/\/careers\.srmtech\.com\/html\/portal\.html$/i,
  },
  {
    matchesUrl: (value) => value === 'https://careers.srmtech.com/html/portal.html',
    status: 302,
    locationPattern: /^https:\/\/careers\.srmtech\.com\/recruit\/IAMSecurityError\.do\?isload=true$/i,
  },
  {
    matchesUrl: (value) => value === 'https://careers.srmtech.com/recruit/IAMSecurityError.do?isload=true',
    status: 302,
    locationPattern: /^https:\/\/careers\.srmtech\.com\/recruit\/login\.sas\?serviceurl=%2Frecruit%2FIAMSecurityError\.do%3Fisload%3Dtrue/i,
  },
  {
    matchesUrl: (value) => /^https:\/\/careers\.srmtech\.com\/recruit\/login\.sas\?serviceurl=%2Frecruit%2FIAMSecurityError\.do%3Fisload%3Dtrue/i.test(String(value ?? '')),
    status: 302,
    locationPattern: /^https:\/\/accounts\.zoho\.com\/signin\?servicename=ZohoRecruit\b/i,
  },
]

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])

const defaultHeaders = {
  'User-Agent': USER_AGENT,
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
}

const withTimeoutSignal = async (operation) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    return await operation(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

const defaultFetchText = async (url) => {
  const responseText = await withTimeoutSignal(async (signal) => {
    const response = await fetch(url, {
      headers: defaultHeaders,
      redirect: 'follow',
      signal,
    })

    return response.text()
  })

  return responseText
}

const defaultTraceRedirectChain = async (url) => {
  const chain = []
  let currentUrl = url

  for (const _step of EXPECTED_HANDOFF_STEPS) {
    const response = await withTimeoutSignal((signal) => fetch(currentUrl, {
      headers: defaultHeaders,
      redirect: 'manual',
      signal,
    }))

    const location = response.headers.get('location')
    const resolvedLocation = location ? new URL(location, currentUrl).toString() : null

    chain.push({
      url: currentUrl,
      status: response.status,
      location: resolvedLocation,
    })

    if (!REDIRECT_STATUS_CODES.has(response.status) || !resolvedLocation) {
      break
    }

    currentUrl = resolvedLocation
  }

  return chain
}

export const hasOfficialGroupSurfaceSignal = (html) =>
  GROUP_SURFACE_SIGNAL_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const hasOfficialCareersPageSignal = (html) =>
  CAREERS_PAGE_SIGNAL_PATTERNS.every((pattern) => pattern.test(String(html ?? '')))

export const hasExpectedHandoffRedirectChain = (chain = []) =>
  EXPECTED_HANDOFF_STEPS.every((expectedStep, index) => {
    const actualStep = chain[index]
    return Boolean(actualStep)
      && expectedStep.matchesUrl(actualStep.url)
      && Number(actualStep.status) === expectedStep.status
      && expectedStep.locationPattern.test(String(actualStep.location ?? ''))
  })

export const getRunnerMetadata = () => ({
  name: SOURCE,
  dryRunFile: 'jobs.json',
  provider: {
    source: SOURCE,
    companyName: COMPANY,
    companyCareerPage: CAREERS_PAGE_URL,
    alternateCareerPages: [GROUP_SURFACE_URL, CAREERS_HANDOFF_URL],
    adapter: 'script',
    atsPlatform: 'zoho-recruit-login-wall',
    countryFilter: 'India',
    parser: 'custom-script',
    paginationStrategy: 'redirect-chain-validation',
    extractionStrategy: 'verified-srm-group-surface-plus-non-public-zoho-handoff-return-empty',
    normalizationProfile: 'engineering-default',
    companyDomain: 'srmtech.com',
  },
})

export const createSrmGroupOfCompaniesScraper = () => ({
  async run({
    fetchText = defaultFetchText,
    traceRedirectChain = defaultTraceRedirectChain,
  } = {}) {
    const groupSurfaceHtml = await fetchText(GROUP_SURFACE_URL)
    if (!hasOfficialGroupSurfaceSignal(groupSurfaceHtml)) {
      throw new Error('SRM Group of Companies verified SRM Group surface no longer matches the known first-party page')
    }

    const careersPageHtml = await fetchText(CAREERS_PAGE_URL)
    if (!hasOfficialCareersPageSignal(careersPageHtml)) {
      throw new Error('SRM Group of Companies verified SRM careers page no longer matches the official first-party handoff page')
    }

    const handoffRedirectChain = await traceRedirectChain(CAREERS_HANDOFF_URL)
    if (!hasExpectedHandoffRedirectChain(handoffRedirectChain)) {
      throw new Error('SRM Group of Companies non-public Zoho Recruit handoff changed or now exposes public jobs')
    }

    return []
  },
})

export const run = async (options = {}) => createSrmGroupOfCompaniesScraper().run(options)

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
