export const SOURCE = 'zopper'
export const COMPANY = 'Zopper'
export const VERIFIED_ON = '2026-07-25'
export const CAREERS_URL = 'https://www.zopper.com/about-us/careers'
export const LINKEDIN_COMPANY_JOBS_URL = 'https://www.linkedin.com/company/zopper/jobs/'
export const LINKEDIN_COMPANY_PAGE_URL = 'https://www.linkedin.com/company/zopper/'
export const LINKEDIN_INDIA_JOBS_URL =
  'https://www.linkedin.com/jobs/search/?f_C=2760462&geoId=102713980'
export const DISPOSITION =
  'verified-first-party-careers-page-plus-public-linkedin-india-jobs-search'
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.zopper.com/about-us/careers was the live first-party Zopper careers page, that its See Open Positions CTA handed applicants to the public LinkedIn company jobs page at https://www.linkedin.com/company/zopper/jobs/, and that the public LinkedIn India jobs search at https://www.linkedin.com/jobs/search/?f_C=2760462&geoId=102713980 exposed current India roles including Relationship Manager (B2B Field Sales) - Bangalore and Business Development Manager, Bancassurance. This scraper validates those verified surfaces and returns jobs only from the public LinkedIn India jobs search.'

const USER_AGENT = 'Mozilla/5.0 (compatible; Jobverify/1.0)'

const REQUIRED_SURFACE_PATTERNS = [
  /\bEmpowering You to Soar Higher Every Day!?/i,
  /\bWhy Zopper Is Your Next Career Move\?/i,
  /\bPerks of Being a Zopperite\b/i,
  /\bWork Hard,\s*Play Harder\b/i,
]

const LINKEDIN_HANDOFF_PATTERN =
  /^https?:\/\/(?:www|in)\.linkedin\.com\/company\/zopper(?:\/jobs\/?)?(?:[?#].*)?$/i

const NON_LINKEDIN_ATS_HOST_PATTERNS = [
  /boards\.greenhouse\.io/i,
  /job-boards\.greenhouse\.io/i,
  /jobs\.lever\.co/i,
  /jobs\.ashbyhq\.com/i,
  /ashbyhq\.com/i,
  /myworkdayjobs\.com/i,
  /workdayjobs\.com/i,
  /smartrecruiters\.com/i,
  /jobvite\.com/i,
  /workable\.com/i,
  /bamboohr\.com/i,
  /applytojob\.com/i,
  /recruitee\.com/i,
  /zohorecruit\.in/i,
  /darwinbox/i,
  /kekahire\.com/i,
  /freshteam\.com/i,
  /teamtailor\.com/i,
]

const SAME_ORIGIN_JOB_PATH_PATTERNS = [
  /^\/career(?:\/|$)/i,
  /^\/careers?(?:\/|$)/i,
  /^\/jobs?(?:\/|$)/i,
  /^\/positions?(?:\/|$)/i,
  /^\/roles?(?:\/|$)/i,
  /^\/openings?(?:\/|$)/i,
  /^\/apply(?:\/|$)/i,
  /^\/join-us(?:\/|$)/i,
]

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&#8211;|&ndash;/gi, '-')
    .replace(/&#8212;|&mdash;/gi, '-')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null

  const normalized = decodeHtml(String(value))
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) =>
  normalizeWhitespace(
    decodeHtml(String(value ?? ''))
      .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '\n')
      .replace(/<p\b[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizePageText = (value = '') =>
  normalizeWhitespace(
    String(value)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value)?.toLowerCase()
  if (!normalized) return null
  if (normalized === 'full_time' || normalized === 'full time' || normalized === 'full-time') {
    return 'Full-time'
  }
  if (normalized === 'part_time' || normalized === 'part time' || normalized === 'part-time') {
    return 'Part-time'
  }
  if (normalized.includes('contract')) return 'Contract'
  if (normalized.includes('intern')) return 'Internship'
  return normalizeWhitespace(value)
}

const normalizePathname = (value = '') => {
  const normalized = String(value).trim().replace(/\/+$/, '')
  return normalized || '/'
}

const parseLocation = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) {
    return {
      location: null,
      city: null,
      country: null,
    }
  }

  const parts = normalized.split(',').map((part) => normalizeWhitespace(part)).filter(Boolean)
  const city = parts[0] || null
  const country = parts.at(-1) === 'India' ? 'India' : parts.at(-1) || null

  return {
    location: normalized,
    city,
    country,
  }
}

const detailLocationFromJsonLd = (jobPosting = {}) => {
  const address = jobPosting?.jobLocation?.address || {}
  const country = address.addressCountry === 'IN'
    ? 'India'
    : normalizeWhitespace(address.addressCountry)
  const parts = [
    normalizeWhitespace(address.addressLocality),
    normalizeWhitespace(address.addressRegion),
    country,
  ].filter(Boolean)

  return {
    location: parts.join(', ') || null,
    city: normalizeWhitespace(address.addressLocality),
    country,
  }
}

const parseJobPostingJsonLd = (html = '') => {
  const scripts = [...String(html).matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>\s*([\s\S]*?)\s*<\/script>/gi,
  )]

  for (const [, rawJson] of scripts) {
    try {
      const parsed = JSON.parse(rawJson)
      if (parsed?.['@type'] === 'JobPosting') return parsed
    } catch {
      // Ignore malformed JSON-LD blocks until the public JobPosting payload is found.
    }
  }

  return null
}

const extractAnchors = (html = '', pageUrl = CAREERS_URL) => {
  const anchors = []
  const matches = String(html).matchAll(
    /<a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi,
  )

  for (const match of matches) {
    const rawHref = match[1] || match[2] || match[3] || ''
    const text = normalizePageText(match[4] || '')

    try {
      anchors.push({
        url: new URL(decodeHtml(rawHref), pageUrl),
        text,
      })
    } catch {
      // Ignore malformed anchors and keep the scraper fail-closed.
    }
  }

  return anchors
}

const extractLinkedUrls = (html = '', pageUrl = CAREERS_URL) => {
  const urls = []
  const matches = String(html).matchAll(
    /(?:href|src|action|data-url)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
  )

  for (const match of matches) {
    const rawValue = match[1] || match[2] || match[3] || ''

    try {
      urls.push(new URL(decodeHtml(rawValue), pageUrl))
    } catch {
      // Ignore malformed URLs and keep the scraper fail-closed.
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

export const hasOfficialCareersPageSignal = (html = '') => {
  const text = normalizePageText(html) || ''
  return REQUIRED_SURFACE_PATTERNS.every((pattern) => pattern.test(text))
}

export const extractLinkedInJobsUrl = (html = '', pageUrl = CAREERS_URL) => {
  const handoff = extractAnchors(html, pageUrl).find(
    ({ url, text }) =>
      /\bsee open positions\b/i.test(text || '')
      && LINKEDIN_HANDOFF_PATTERN.test(url.toString()),
  )

  return handoff?.url?.toString() || null
}

export const pageIndicatesZopperLinkedInCompany = (html = '') => {
  const page = String(html)
  const text = normalizePageText(page) || ''

  return /\bzopper\s*\|\s*linkedin\b/i.test(page)
    && /\bdemocratising access to insurance\b/i.test(text)
    && /https:\/\/www\.zopper\.com\b/i.test(page)
    && (
      /\burn:li:organization:2760462\b/i.test(page)
      || /\bnoida,\s*uttar pradesh\b/i.test(text)
    )
}

export const hasVerifiedLinkedInJobsPageSignal = (html = '') => {
  const page = String(html)
  const text = normalizePageText(page) || ''

  return /\blinkedin\b/i.test(text)
    && /\bzopper\b/i.test(text)
    && (
      /base-card__full-link/i.test(page)
      || /\bno matching jobs found\b/i.test(text)
      || /\b\d+\s+jobs?\s+in\s+india\b/i.test(text)
      || /\byou'?re now using ai-powered job search\b/i.test(text)
      || /\bzopper\s*\(\d+\)/i.test(text)
    )
}

export const extractSearchResults = (html = '') =>
  [...String(html).matchAll(
    /<div class="base-card[\s\S]*?job-search-card"[\s\S]*?data-entity-urn="urn:li:jobPosting:([0-9]+)"[\s\S]*?<a class="base-card__full-link[^"]*" href="([^"]+)"[\s\S]*?<h3 class="base-search-card__title">\s*([\s\S]*?)\s*<\/h3>[\s\S]*?<h4 class="base-search-card__subtitle">[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>[\s\S]*?<span class="job-search-card__location">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time class="job-search-card__listdate" datetime="([^"]+)"/gi,
  )]
    .map((match) => {
      const [, jobId, rawHref, rawTitle, rawCompany, rawLocation, postingDate] = match
      const title = stripTags(rawTitle)
      const company = stripTags(rawCompany)
      const sourceUrl = normalizeWhitespace(rawHref)?.replace(/&amp;/g, '&')
      const locationData = parseLocation(stripTags(rawLocation))

      if (!jobId || !title || !company || !sourceUrl) return null
      if (company !== COMPANY || locationData.country !== 'India') return null

      return {
        title,
        company,
        department: null,
        location: locationData.location,
        city: locationData.city,
        country: locationData.country,
        jobId,
        requisitionId: jobId,
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: null,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: [],
        postingDate: normalizeWhitespace(postingDate),
        closingDate: null,
        jobDescription: null,
      }
    })
    .filter(Boolean)
    .filter((listing, index, collection) =>
      collection.findIndex((candidate) => candidate.jobId === listing.jobId) === index)

export const extractJobDetail = (html = '', listing = {}) => {
  const jobPosting = parseJobPostingJsonLd(html)
  if (!jobPosting) return {}

  const title = normalizeWhitespace(jobPosting?.title)
  const company = normalizeWhitespace(jobPosting?.hiringOrganization?.name)
  const expectedTitle = normalizeWhitespace(listing?.title)

  if (company && company !== COMPANY) {
    throw new Error(
      `Zopper LinkedIn detail page no longer matches the expected company identity: ${listing?.sourceUrl || 'unknown'}`,
    )
  }

  if (title && expectedTitle && title !== expectedTitle) {
    throw new Error(
      `Zopper LinkedIn detail page no longer matches the expected job title: ${listing?.sourceUrl || 'unknown'}`,
    )
  }

  const locationData = detailLocationFromJsonLd(jobPosting)

  return {
    company: company || null,
    location: locationData.location,
    city: locationData.city,
    country: locationData.country,
    employmentType: normalizeEmploymentType(jobPosting?.employmentType),
    postingDate: normalizeWhitespace(jobPosting?.datePosted)?.slice(0, 10) || null,
    jobDescription: stripTags(jobPosting?.description) || null,
  }
}

const assertVerifiedOfficialCareersSurface = (html = '') => {
  if (hasOfficialCareersPageSignal(html)) return

  throw new Error(
    'Zopper verified official careers surface changed; review the public contract before promoting further parser changes.',
  )
}

const assertVerifiedLinkedInHandoff = (html = '', pageUrl = CAREERS_URL) => {
  if (extractLinkedInJobsUrl(html, pageUrl) === LINKEDIN_COMPANY_JOBS_URL) return

  throw new Error(
    'Zopper verified LinkedIn careers handoff changed; review the first-party careers contract.',
  )
}

const assertNoUnexpectedFirstPartyJobsSurface = (html = '', careersUrl = CAREERS_URL) => {
  if (hasJobPostingMarkup(html)) {
    throw new Error(
      'Zopper public careers surface now exposes JobPosting markup; review whether a first-party parser should replace the LinkedIn flow.',
    )
  }

  const careersPage = new URL(careersUrl)
  const careersPath = normalizePathname(careersPage.pathname)
  const linkedUrls = extractLinkedUrls(html, careersUrl)

  const atsBoardUrl = linkedUrls.find((url) =>
    NON_LINKEDIN_ATS_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname)),
  )
  if (atsBoardUrl) {
    throw new Error(
      `Zopper public careers surface now exposes a different public jobs surface via ${atsBoardUrl.toString()}.`,
    )
  }

  const sameOriginJobUrl = linkedUrls.find((url) => {
    if (url.origin !== careersPage.origin) return false

    const pathname = normalizePathname(url.pathname)
    if (pathname === careersPath && !url.search && !url.hash) return false

    return SAME_ORIGIN_JOB_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
  })
  if (sameOriginJobUrl) {
    throw new Error(
      `Zopper public careers surface now exposes a first-party public jobs surface via ${sameOriginJobUrl.toString()}.`,
    )
  }
}

const defaultFetchText = async (url) => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })

  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.text()
}

const mergeListingWithDetail = (listing, detail = {}) => ({
  ...listing,
  ...Object.fromEntries(
    Object.entries(detail).filter(([, value]) => value != null),
  ),
})

export const createZopperScraper = ({ maxJobs = null } = {}) => ({
  async run({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) {
    const careersHtml = await fetchText(CAREERS_URL)

    assertVerifiedOfficialCareersSurface(careersHtml)
    assertVerifiedLinkedInHandoff(careersHtml, CAREERS_URL)
    assertNoUnexpectedFirstPartyJobsSurface(careersHtml, CAREERS_URL)

    const companyHtml = await fetchText(LINKEDIN_COMPANY_PAGE_URL)
    if (!pageIndicatesZopperLinkedInCompany(companyHtml)) {
      throw new Error(
        'Zopper LinkedIn company page no longer matches the expected public organization page.',
      )
    }

    const searchHtml = await fetchText(LINKEDIN_INDIA_JOBS_URL)
    if (!hasVerifiedLinkedInJobsPageSignal(searchHtml)) {
      throw new Error(
        'Zopper LinkedIn India jobs search page no longer matches the verified public search shell.',
      )
    }

    const listings = extractSearchResults(searchHtml)
    const selectedJobs = Number.isInteger(maxJobs) ? listings.slice(0, maxJobs) : listings
    const enrichedJobs = []

    for (const listing of selectedJobs) {
      try {
        const detailHtml = await fetchText(listing.sourceUrl)
        enrichedJobs.push(mergeListingWithDetail(listing, extractJobDetail(detailHtml, listing)))
      } catch (error) {
        console.warn(
          `  [${SOURCE}] Failed to enrich LinkedIn detail for ${listing.sourceUrl}: ${error.message}`,
        )
        enrichedJobs.push(listing)
      }
    }

    return enrichedJobs.map((job) => ({
      ...job,
      source: SOURCE,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: now(),
    }))
  },
})

export const run = async (options = {}) => createZopperScraper().run(options)
