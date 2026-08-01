export const SOURCE = 'yulu'
export const COMPANY = 'Yulu'
export const OFFICIAL_BRAND = 'Yulu'
export const CAREERS_URL = 'https://careers.yulu.bike/'
export const JOBS_BOARD_URL = 'https://yulu.mynexthire.com/employer/jobs/careers'
export const REQUISITION_LIST_URL =
  'https://yulu.mynexthire.com/employer/careers/reqlist/get'
export const CLIENT_DETAILS_URL =
  'https://yulu.mynexthire.com/employer/jobboard/details_by_shortname/get/yulu/'
export const DISPOSITION =
  'verified-first-party-careers-shell-with-mynexthire-handoff-and-public-listing-error-fail-closed'
export const EXPECTED_LISTINGS_ERROR_MESSAGE =
  'Unable to process your request at this time; please try a little later or contact your administrator!'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://careers.yulu.bike/ was the live Yulu first-party careers shell, that it embedded the Yulu MyNextHire board at https://yulu.mynexthire.com/employer/jobs/careers, that the public board metadata remained visible at https://yulu.mynexthire.com/employer/jobboard/details_by_shortname/get/yulu/, and that the public requisition list endpoint at https://yulu.mynexthire.com/employer/careers/reqlist/get responded with "Unable to process your request at this time; please try a little later or contact your administrator!" instead of a trustworthy enumerable jobs payload. This company-local scraper therefore stays fail-closed and returns no jobs until the public MyNextHire requisition contract becomes trustworthy.'

const REQUIRED_TEXT_PATTERNS = [
  /\bredefine urban mobility\b/i,
  /\bat yulu,\s*passion meets purpose\b/i,
  /\bwhy join us\?/i,
  /\blife at yulu\b/i,
  /\byulu is india(?:'|’)?s largest shared ev and baas company\b/i,
  /\bstay in touch!?/i,
  /career@yulu\.bike/i,
]

const REQUIRED_HTML_PATTERNS = [
  /https:\/\/yulu\.mynexthire\.com\/employer\/ui\/js\/jobboard\/careers-integration\.js/i,
  /mnh_ci_onreadystatechange\(["']careers["'],\s*["']yulu["']/i,
  /<iframe[^>]*id=["']mnhembedded["'][^>]*>/i,
  /id=["']target["']/i,
  /scrollToDiv\(\)/i,
]

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim()

export const buildListingsRequestBody = () => ({
  source: 'careers',
  code: '',
  filterByBuId: -1,
})

export const hasVerifiedCareersSurface = (html = '') => {
  const rawHtml = String(html)
  const text = normalizeText(rawHtml)

  return REQUIRED_TEXT_PATTERNS.every((pattern) => pattern.test(text))
    && REQUIRED_HTML_PATTERNS.every((pattern) => pattern.test(rawHtml))
}

export const hasExpectedListingsError = (payload = {}) =>
  normalizeText(payload?.errorMessage) === EXPECTED_LISTINGS_ERROR_MESSAGE

const hasEnumerableListingsPayload = (payload = {}) =>
  Array.isArray(payload?.reqDetailsBOList)

const assertVerifiedCareersSurface = (html = '') => {
  if (hasVerifiedCareersSurface(html)) return

  throw new Error(
    'Yulu verified careers shell no longer matches the first-party MyNextHire handoff contract.',
  )
}

const assertVerifiedListingsState = (payload = {}) => {
  if (hasEnumerableListingsPayload(payload)) {
    throw new Error(
      'Yulu public MyNextHire requisition list now returns data; promote a real parser.',
    )
  }

  if (hasExpectedListingsError(payload)) return

  throw new Error(
    'Yulu public MyNextHire requisition contract changed materially; review the unexpected public listing response before promoting a parser.',
  )
}

const defaultFetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': 'Mozilla/5.0 (compatible; Jobify/1.0)',
      ...(options.headers || {}),
    },
    body: options.body,
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)

  const text = await response.text()

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`Expected a JSON response from ${url}`)
  }
}

export const createYuluScraper = ({
  careersUrl = CAREERS_URL,
  requisitionListUrl = REQUISITION_LIST_URL,
} = {}) => ({
  async run({ fetchHtml = defaultFetchHtml, fetchJson = defaultFetchJson } = {}) {
    const careersHtml = await fetchHtml(careersUrl)
    assertVerifiedCareersSurface(careersHtml)

    const listingsPayload = await fetchJson(requisitionListUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildListingsRequestBody()),
    })

    assertVerifiedListingsState(listingsPayload)
    return []
  },
})

export const run = async (options = {}) => createYuluScraper().run(options)
