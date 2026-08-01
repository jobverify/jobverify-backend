export const SOURCE = 'urbanpiper'
export const COMPANY = 'UrbanPiper'
export const CAREERS_URL = 'https://www.urbanpiper.com/careers'
export const CAREERS_HEADING = 'Careers at UrbanPiper'
export const PRIMARY_CAREERS_COPY =
  'Join a global team shaping the next generation of the digital ecosystem for restaurants.'
export const SECONDARY_CAREERS_COPY =
  'Join the team shaping the future of restaurant tech'
export const BROWSE_ALL_JOBS_CTA = 'Browse all jobs'
export const DISPOSITION = 'verified-browse-all-jobs-handoff-sentinel'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobify/1.0)'

const normalizeText = (value = '') =>
  String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

const normalizePathname = (value = '') => {
  const normalized = String(value).replace(/\/+$/, '')
  return normalized || '/'
}

const normalizePageUrl = (value = '') => {
  try {
    const url = new URL(value)
    url.hash = ''
    if (url.pathname !== '/') {
      url.pathname = normalizePathname(url.pathname)
    }
    return url.toString()
  } catch {
    return String(value || '')
  }
}

const extractAnchors = (html = '', baseUrl = CAREERS_URL) => Array.from(
  String(html).matchAll(
    /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi,
  ),
  (match) => {
    const href = match[1] || match[2] || match[3] || null
    const label = normalizeText(match[4])

    try {
      return {
        href,
        label,
        url: href ? new URL(href, baseUrl).toString() : null,
      }
    } catch {
      return {
        href,
        label,
        url: null,
      }
    }
  },
)

const dedupe = (values) => {
  const seen = new Set()
  const output = []

  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    output.push(value)
  }

  return output
}

const hasJobPostingMarkup = (html = '') => {
  const page = String(html)
  return /application\/ld\+json/i.test(page) && /\bJobPosting\b/i.test(page)
}

export const extractBrowseAllJobsTargets = (html = '', baseUrl = CAREERS_URL) =>
  dedupe(
    extractAnchors(html, baseUrl)
      .filter(({ label }) => label.toLowerCase() === BROWSE_ALL_JOBS_CTA.toLowerCase())
      .map(({ url }) => url),
  )

const extractLikelyFirstPartyJobLinks = (html = '', baseUrl = CAREERS_URL) => {
  const careersUrl = new URL(baseUrl)
  const careersPath = normalizePathname(careersUrl.pathname)

  return dedupe(
    extractAnchors(html, baseUrl)
      .map(({ url }) => url)
      .filter(Boolean)
      .filter((url) => {
        try {
          const target = new URL(url)
          if (target.origin !== careersUrl.origin) return false

          const path = normalizePathname(target.pathname)
          if (path === careersPath && !target.search && !target.hash) return false

          return (
            /^\/careers\/[^/?#]+/i.test(path)
            || /^\/jobs?(?:\/|$)/i.test(path)
            || /^\/positions?(?:\/|$)/i.test(path)
            || /^\/openings?(?:\/|$)/i.test(path)
            || /\b(job|jobs|career|careers|role|roles|opening|openings|opportunit)/i.test(
              `${target.pathname}${target.search}${target.hash}`,
            )
          )
        } catch {
          return false
        }
      }),
  )
}

export const isFirstPartyListingsSurface = (value, baseUrl = CAREERS_URL) => {
  if (!value) return false

  try {
    const target = new URL(value, baseUrl)
    const careersUrl = new URL(baseUrl)

    if (target.origin !== careersUrl.origin) return false

    const targetPath = normalizePathname(target.pathname)
    const careersPath = normalizePathname(careersUrl.pathname)
    if (targetPath === careersPath && !target.search && !target.hash) return false

    return (
      /^\/careers(?:\/|$)/i.test(targetPath)
      || /^\/jobs?(?:\/|$)/i.test(targetPath)
      || /^\/positions?(?:\/|$)/i.test(targetPath)
      || /^\/openings?(?:\/|$)/i.test(targetPath)
      || /\b(job|jobs|career|careers|role|roles|opening|openings|opportunit)/i.test(
        `${target.pathname}${target.search}${target.hash}`,
      )
    )
  } catch {
    return false
  }
}

const assertVerifiedContract = (page, careersUrl = CAREERS_URL) => {
  const { status, url, html } = page

  if (status !== 200) {
    throw new Error(
      `UrbanPiper careers contract changed: expected 200 from ${careersUrl}, received ${status}.`,
    )
  }

  if (normalizePageUrl(url) !== normalizePageUrl(careersUrl)) {
    throw new Error(
      `UrbanPiper careers contract changed: expected final URL ${careersUrl}, received ${url}.`,
    )
  }

  const text = normalizeText(html)

  if (!new RegExp(CAREERS_HEADING.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(text)) {
    throw new Error('UrbanPiper careers contract changed: missing Careers at UrbanPiper heading.')
  }

  if (!text.includes(PRIMARY_CAREERS_COPY)) {
    throw new Error('UrbanPiper careers contract changed: missing primary careers copy.')
  }

  if (!text.includes(SECONDARY_CAREERS_COPY)) {
    throw new Error('UrbanPiper careers contract changed: missing secondary careers copy.')
  }

  const browseTargets = extractBrowseAllJobsTargets(html, careersUrl)
  if (browseTargets.length === 0) {
    throw new Error('UrbanPiper careers contract changed: missing Browse all jobs handoff.')
  }

  if (hasJobPostingMarkup(html)) {
    throw new Error(
      'UrbanPiper careers surface now exposes JobPosting markup; promote a real parser.',
    )
  }

  const browseAllJobsFirstPartySurface = browseTargets.find((target) =>
    isFirstPartyListingsSurface(target, careersUrl),
  )
  if (browseAllJobsFirstPartySurface) {
    throw new Error(
      `UrbanPiper careers surface now links to a first-party jobs page: ${browseAllJobsFirstPartySurface}`,
    )
  }

  const firstPartyJobLinks = extractLikelyFirstPartyJobLinks(html, careersUrl)
  if (firstPartyJobLinks.length > 0) {
    throw new Error(
      `UrbanPiper careers surface now exposes first-party job links: ${firstPartyJobLinks.join(', ')}`,
    )
  }
}

const defaultFetchPage = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': USER_AGENT,
    },
    redirect: 'follow',
  })

  return {
    status: response.status,
    url: response.url,
    html: await response.text(),
  }
}

export const createUrbanPiperScraper = ({ careersUrl = CAREERS_URL } = {}) => ({
  async run({ fetchPage = defaultFetchPage } = {}) {
    const page = await fetchPage(careersUrl)
    assertVerifiedContract(page, careersUrl)
    return []
  },
})

export const run = async (options = {}) => createUrbanPiperScraper().run(options)
