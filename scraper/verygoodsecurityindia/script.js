export const SOURCE = 'verygoodsecurityindia'
export const COMPANY = 'Very Good Security India'
export const CAREERS_URL = 'https://www.verygoodsecurity.com/careers'
export const DISPOSITION = 'verified-non-enumerable-careers-surface'

const REQUIRED_CONTRACT_PATTERNS = [
  /it takes exceptional people to create vgs/i,
  /what we are looking for in each teammate/i,
  /current vgs job openings below/i,
]

const TRUSTED_ATS_HOST_PATTERNS = [
  /boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /jobs\.ashbyhq\.com/i,
  /ashbyhq\.com/i,
  /myworkdayjobs\.com/i,
  /smartrecruiters\.com/i,
  /jobvite\.com/i,
  /workable\.com/i,
  /bamboohr\.com/i,
  /applytojob\.com/i,
  /recruitee\.com/i,
]

const SAME_ORIGIN_JOB_PATH_PATTERNS = [
  /^\/careers\/[^/?#]+$/i,
  /^\/jobs?\/[^/?#]+/i,
  /^\/positions?\/[^/?#]+/i,
  /^\/openings?\/[^/?#]+/i,
  /^\/apply\/[^/?#]+/i,
  /^\/jobpost\/[^/?#]+/i,
]

const SAME_ORIGIN_FRAMEWORK_ASSET_PATH_PATTERNS = [
  /(?:^|\/)_payload\.(?:json|js)$/i,
  /(?:^|\/)_nuxt(?:\/|$)/i,
]

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePathname = (value = '') => {
  const normalized = String(value).trim().replace(/\/+$/, '')
  return normalized || '/'
}

const extractLinkedUrls = (html = '', pageUrl = CAREERS_URL) => {
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )
  const urls = []

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''

    try {
      urls.push(new URL(rawValue, pageUrl))
    } catch {
      // Ignore malformed URLs and keep the contract fail-closed.
    }
  }

  return urls
}

const hasJobPostingMarkup = (html = '') => {
  const blocks = String(html).matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  )

  for (const block of blocks) {
    if (/\bJobPosting\b/i.test(block[1])) return true
  }

  return false
}

const isSameOriginFrameworkAssetUrl = (url) =>
  SAME_ORIGIN_FRAMEWORK_ASSET_PATH_PATTERNS.some((pattern) =>
    pattern.test(normalizePathname(url.pathname)),
  )

const assertNoTrustedListingsSurface = (html = '', careersUrl = CAREERS_URL) => {
  if (hasJobPostingMarkup(html)) {
    throw new Error(
      'Very Good Security India careers page now exposes a public listings surface via JobPosting markup.',
    )
  }

  const careersOrigin = new URL(careersUrl).origin
  const careersPath = normalizePathname(new URL(careersUrl).pathname)
  const linkedUrls = extractLinkedUrls(html, careersUrl)
  const atsBoardUrl = linkedUrls.find((url) =>
    TRUSTED_ATS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname)),
  )

  if (atsBoardUrl) {
    throw new Error(
      `Very Good Security India careers page now exposes a public listings surface via ${atsBoardUrl.toString()}.`,
    )
  }

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== careersOrigin) return false

    const pathname = normalizePathname(url.pathname)
    if (pathname === careersPath) return false
    if (isSameOriginFrameworkAssetUrl(url)) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })

  if (sameOriginJobUrl) {
    throw new Error(
      `Very Good Security India careers page now exposes a public listings surface via ${sameOriginJobUrl.toString()}.`,
    )
  }
}

const assertVerifiedContract = (html = '') => {
  const text = normalizeText(html)

  if (REQUIRED_CONTRACT_PATTERNS.every((pattern) => pattern.test(text))) return

  throw new Error(
    'Very Good Security India careers page no longer matches the verified careers contract.',
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

export const createVeryGoodSecurityIndiaScraper = () => ({
  async run({ fetchHtml = defaultFetchHtml } = {}) {
    const html = await fetchHtml(CAREERS_URL)
    assertVerifiedContract(html)
    assertNoTrustedListingsSurface(html)
    return []
  },
})

export const run = async (options = {}) =>
  createVeryGoodSecurityIndiaScraper().run(options)
