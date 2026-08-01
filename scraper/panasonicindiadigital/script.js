export const SOURCE = 'panasonicindiadigital'
export const COMPANY = 'Panasonic India Digital'
export const OFFICIAL_BRAND = 'Panasonic India'
export const PUBLIC_SURFACE_URL = 'https://www.panasonic.com/in/'
export const CORPORATE_URL = 'https://www.panasonic.com/in/corporate.html'
export const GLOBAL_CAREERS_URL =
  'https://careers.na.panasonic.com/corporate/jobs/locations/country/India'
export const DISPOSITION = 'verified-panasonic-india-corporate-handoff-fail-closed'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.panasonic.com/in/ and https://www.panasonic.com/in/corporate.html were the live Panasonic India public surfaces reviewed for Panasonic India Digital, and that the corporate page handed off to Panasonic\'s global careers experience at https://careers.na.panasonic.com/. Local repo evidence does not establish that the broader Panasonic India jobs inventory is attributable specifically to the exact workbook entity Panasonic India Digital, so this company-specific scraper remains fail-closed and returns no jobs until an exact-name public openings contract is verified.'

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
  /darwinbox/i,
  /zohorecruit\.in/i,
  /icims\.com/i,
]

const SAME_ORIGIN_JOB_PATH_PATTERNS = [
  /^\/careers?(?:\/|$)/i,
  /^\/jobs?(?:\/|$)/i,
  /^\/positions?(?:\/|$)/i,
  /^\/roles?(?:\/|$)/i,
  /^\/openings?(?:\/|$)/i,
  /^\/apply(?:\/|$)/i,
  /^\/join-us(?:\/|$)/i,
  /^\/work-with-us(?:\/|$)/i,
  /^\/hiring(?:\/|$)/i,
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

const extractTitle = (html = '') =>
  normalizeText(String(html).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')

const hasCanonicalUrl = (html = '', expectedUrl) => {
  const rawHtml = String(html)
  const escapedUrl = expectedUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  return new RegExp(
    `<(?:link|meta)\\b[^>]+(?:href|content)=["']${escapedUrl}["'][^>]*>`,
    'i',
  ).test(rawHtml)
}

const resolveUrl = (value, baseUrl) => {
  if (!value) return null

  try {
    return new URL(decodeEntities(value), baseUrl)
  } catch {
    return null
  }
}

const extractAnchors = (html = '', pageUrl) => {
  const anchors = []
  const matches = String(html).matchAll(
    /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi,
  )

  for (const match of matches) {
    const rawHref = match[1] || match[2] || match[3] || ''
    const url = resolveUrl(rawHref, pageUrl)
    if (!url) continue

    anchors.push({
      text: normalizeText(match[4] || ''),
      url,
    })
  }

  return anchors
}

const extractLinkedUrls = (html = '', pageUrl) => {
  const urls = []
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url|data-href|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''
    const url = resolveUrl(rawValue, pageUrl)
    if (url) urls.push(url)
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

export const hasVerifiedIndiaPublicSurface = (html = '') => {
  const text = normalizeText(html)
  const title = extractTitle(html)

  return /\bpanasonic\b/i.test(title)
    && /\bindia\b/i.test(title || text)
    && /\bpanasonic\b/i.test(text)
    && hasCanonicalUrl(html, PUBLIC_SURFACE_URL)
}

export const findVerifiedGlobalCareersHandoff = (html = '', pageUrl = CORPORATE_URL) =>
  extractAnchors(html, pageUrl).find(
    ({ text, url }) =>
      /\bcareers\b/i.test(text)
      && url.hostname.toLowerCase() === 'careers.na.panasonic.com'
      && /^\/corporate(?:\/|$)/i.test(url.pathname),
  ) || null

export const hasVerifiedCorporateSurface = (html = '') => {
  const text = normalizeText(html)
  const title = extractTitle(html)

  return /\bpanasonic\b/i.test(title || text)
    && /\bindia\b/i.test(text)
    && hasCanonicalUrl(html, CORPORATE_URL)
    && Boolean(findVerifiedGlobalCareersHandoff(html, CORPORATE_URL))
}

const assertVerifiedIndiaPublicSurface = (html = '') => {
  if (hasVerifiedIndiaPublicSurface(html)) return

  throw new Error(
    'Panasonic India Digital verified Panasonic India public surface changed; review the public contract before promoting a real parser.',
  )
}

const assertVerifiedCorporateHandoff = (html = '') => {
  if (hasVerifiedCorporateSurface(html)) return

  throw new Error(
    'Panasonic India Digital verified Panasonic careers handoff changed; review the corporate surface before promoting a real parser.',
  )
}

const assertNoUnexpectedPublicJobsSurface = (
  html = '',
  pageUrl,
  { allowUrl = null } = {},
) => {
  if (hasJobPostingMarkup(html)) {
    throw new Error(
      'Panasonic India public surface now exposes JobPosting markup; promote a real parser.',
    )
  }

  const page = new URL(pageUrl)
  const pagePath = normalizePathname(page.pathname)
  const allowedUrl = allowUrl ? new URL(allowUrl) : null

  const linkedUrls = extractLinkedUrls(html, pageUrl)

  const atsUrl = linkedUrls.find((url) => {
    if (
      allowedUrl
      && url.origin === allowedUrl.origin
      && normalizePathname(url.pathname) === normalizePathname(allowedUrl.pathname)
    ) {
      return false
    }

    return TRUSTED_ATS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname))
  })

  if (atsUrl) {
    throw new Error(
      `Panasonic India public surface now exposes a public jobs surface via ${atsUrl.toString()}.`,
    )
  }

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== page.origin) return false

    const pathname = normalizePathname(url.pathname)
    if (pathname === pagePath && !url.search && !url.hash) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })

  if (sameOriginJobUrl) {
    throw new Error(
      `Panasonic India public surface now exposes a public jobs surface via ${sameOriginJobUrl.toString()}.`,
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

export const createPanasonicIndiaDigitalScraper = () => ({
  async run({ fetchHtml = defaultFetchHtml } = {}) {
    const [publicSurfaceHtml, corporateHtml] = await Promise.all([
      fetchHtml(PUBLIC_SURFACE_URL),
      fetchHtml(CORPORATE_URL),
    ])

    assertVerifiedIndiaPublicSurface(publicSurfaceHtml)
    assertNoUnexpectedPublicJobsSurface(publicSurfaceHtml, PUBLIC_SURFACE_URL)

    assertVerifiedCorporateHandoff(corporateHtml)
    assertNoUnexpectedPublicJobsSurface(corporateHtml, CORPORATE_URL, {
      allowUrl: GLOBAL_CAREERS_URL,
    })

    return []
  },
})

export const run = async (options = {}) => createPanasonicIndiaDigitalScraper().run(options)
