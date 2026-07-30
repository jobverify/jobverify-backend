export const SOURCE = 'suprdaily'
export const COMPANY = 'Supr Daily'
export const CAREERS_URL = 'https://www.suprdaily.com/'
export const VERIFIED_BRAND_COPY = 'Supr Daily by Swiggy'
export const DISPOSITION = 'verified-exact-name-public-company-surface'

const VERIFIED_BRAND_PATTERN = /\bsupr\s+daily\s+by\s+swiggy\b/i

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
  /^\/careers?(?:\/|$)/i,
  /^\/jobs?(?:\/|$)/i,
  /^\/positions?(?:\/|$)/i,
  /^\/openings?(?:\/|$)/i,
  /^\/join-us(?:\/|$)/i,
  /^\/work-with-us(?:\/|$)/i,
  /^\/apply(?:\/|$)/i,
]

const decodeEntities = (value = '') =>
  String(value)
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")

const normalizeText = (value = '') =>
  decodeEntities(String(value))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
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
      urls.push(new URL(decodeEntities(rawValue), pageUrl))
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

const assertVerifiedContract = (html = '') => {
  const text = normalizeText(html)

  if (VERIFIED_BRAND_PATTERN.test(text)) return

  throw new Error(
    'Supr Daily verified exact-name public company surface changed; review for a real scraper.',
  )
}

const assertNoTrustedJobsSurface = (html = '', careersUrl = CAREERS_URL) => {
  if (hasJobPostingMarkup(html)) {
    throw new Error(
      'Supr Daily public company surface now exposes JobPosting markup; promote a real parser.',
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
      `Supr Daily public company surface now exposes a trustworthy public jobs surface via ${atsBoardUrl.toString()}.`,
    )
  }

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== careersOrigin) return false

    const pathname = normalizePathname(url.pathname)
    if (pathname === careersPath && !url.search && !url.hash) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })

  if (sameOriginJobUrl) {
    throw new Error(
      `Supr Daily public company surface now exposes a trustworthy public jobs surface via ${sameOriginJobUrl.toString()}.`,
    )
  }
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

export const createSuprDailyScraper = () => ({
  async run({ fetchHtml = defaultFetchHtml } = {}) {
    const html = await fetchHtml(CAREERS_URL)
    assertVerifiedContract(html)
    assertNoTrustedJobsSurface(html, CAREERS_URL)
    return []
  },
})

export const run = async (options = {}) => createSuprDailyScraper().run(options)
