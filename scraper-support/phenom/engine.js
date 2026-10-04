import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry, fetchJsonWithRetry } from '../utils/fetch.js'

const DEFAULT_FETCH_TIMEOUT_MS = 15000
const DEFAULT_LISTING_BUDGET_MS = 120000
const DEFAULT_DETAIL_BUDGET_MS = 30000
const nonnegativeBudget = (value, fallback) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : fallback
const incompleteSnapshot = message => Object.assign(new Error('PHENOM_INCOMPLETE_SNAPSHOT: ' + message), { code: 'PHENOM_INCOMPLETE_SNAPSHOT' })
const requestWithSignal = async (fetcher, url, signal, requestOptions = {}) => {
  signal?.throwIfAborted()
  let onAbort
  const aborted = signal && new Promise((_, reject) => {
    onAbort = () => reject(signal.reason)
    signal.addEventListener('abort', onAbort, { once: true })
  })
  try {
    const request = Promise.resolve().then(() => { signal?.throwIfAborted(); return fetcher(url, { ...requestOptions, signal }) })
    return await (aborted ? Promise.race([request, aborted]) : request)
  } finally {
    if (onAbort) signal.removeEventListener('abort', onAbort)
    signal?.throwIfAborted()
  }
}

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&#x2F;/gi, '/')
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = decodeHtmlEntities(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const extractFirst = (pattern, value, transform = (match) => match[1]) => {
  const match = pattern.exec(value)
  return match ? transform(match) : null
}

const EXPERIENCE_KEYWORD_PATTERN = /\b(?:experience|experienced|exp\.?)\b/i
const EXPERIENCE_DURATION_PATTERN = /\b(?:\d+(?:\.\d+)?\+?\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr))\b/i
const EXPERIENCE_LABEL_MAP = new Map([
  ['no experience required', 'No experience required'],
  ['fresher', 'Fresher'],
  ['freshers', 'Fresher'],
  ['experienced', 'Experienced'],
  ['experienced professional', 'Experienced Professional'],
  ['entry level', 'Entry Level'],
  ['intern', 'Intern'],
  ['internship', 'Internship'],
  ['junior', 'Junior'],
  ['associate', 'Associate'],
  ['mid level', 'Mid Level'],
  ['mid-level', 'Mid Level'],
  ['mid senior level', 'Mid-Senior level'],
  ['mid-senior level', 'Mid-Senior level'],
  ['senior', 'Senior'],
])

const extractJsonObjectAfterMarker = (value, marker) => {
  const source = String(value)
  const markerIndex = source.indexOf(marker)
  if (markerIndex < 0) return null

  const start = source.indexOf('{', markerIndex + marker.length)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escapeNext = false

  for (let index = start; index < source.length; index += 1) {
    const char = source[index]

    if (inString) {
      if (escapeNext) {
        escapeNext = false
      } else if (char === '\\') {
        escapeNext = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
      continue
    }

    if (char === '{') {
      depth += 1
      continue
    }

    if (char === '}') {
      depth -= 1
      if (depth === 0) {
        return source.slice(start, index + 1)
      }
    }
  }

  return null
}

const parseJson = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const normalizeAggregationMap = (aggregations = []) => Object.fromEntries(
  aggregations
    .filter((item) => item?.field)
    .map((item) => [item.field, item.value || {}]),
)

const normalizeExperienceLabel = (value) => {
  const text = stripTags(value)
  if (!text) return null
  const normalized = normalizeWhitespace(text)
    ?.replace(/[.:;,\s-]+$/g, '')
    .toLowerCase()

  return normalized ? EXPERIENCE_LABEL_MAP.get(normalized) || null : null
}

const normalizeExperienceDuration = (value) => normalizeWhitespace(value)
  ?.replace(/\s*\+\s*(?=[a-z])/gi, '+ ')
  .replace(/\s*-\s*/g, ' - ')
  .replace(/\s*\bto\b\s*/gi, ' to ')
  .replace(/\b(?:yr|year)\b/gi, 'year')
  .replace(/\b(?:yrs|years)\b/gi, 'years')
  .replace(/\b(?:mo|month)\b/gi, 'month')
  .replace(/\b(?:mos|months)\b/gi, 'months')

const extractExperienceDuration = (value, { requireKeyword = true } = {}) => {
  const text = stripTags(value)
  if (!text) return null
  const normalizedText = text.replace(
    /(\d+(?:\.\d+)?)\s+\+\s*(?=(?:months?|mos?|mo|years?|yrs?|yr)\b)/gi,
    '$1+ ',
  )
    .replace(/[\u2013\u2014\u2212]/g, '-')
  if (requireKeyword) {
    const contextualMatch = (
      normalizedText.match(
        /\b((?:\d+(?:\.\d+)?\+?\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)))(?:\s+of)?(?:\s+[a-z0-9/&()-]+){0,8}\s+(?:experience|experienced|exp\.?)\b/i,
      )
      || normalizedText.match(
        /\b(?:experience|experienced|exp\.?)\b[^.]{0,80}?\b((?:\d+(?:\.\d+)?\+?\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)))\b/i,
      )
    )
    if (contextualMatch) {
      return normalizeExperienceDuration(contextualMatch[1])
    }

    const sectionHeadingMatch = normalizedText.match(
      /\bexperience(?:\s*&\s*[a-z]+)?\b[^0-9]{0,40}\b((?:\d+(?:\.\d+)?\+?\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)))\b/i,
    )
    if (sectionHeadingMatch) {
      return normalizeExperienceDuration(sectionHeadingMatch[1])
    }

    const leadingTitleDurationMatch = normalizedText.match(
      /^[^.]{0,160}?\(\s*((?:\d+(?:\.\d+)?\+?\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)\s*(?:-|to)\s*\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)|\d+(?:\.\d+)?\+?\s*(?:months?|mos?|mo|years?|yrs?|yr)))\s*\)/i,
    )
    if (leadingTitleDurationMatch) {
      return normalizeExperienceDuration(leadingTitleDurationMatch[1])
    }

    return null
  }

  const matched = normalizedText.match(EXPERIENCE_DURATION_PATTERN)
  return matched ? normalizeExperienceDuration(matched[0]) : null
}

const extractExperienceSnippet = (value, { requireKeyword = true, allowLabels = false } = {}) => {
  const duration = extractExperienceDuration(value, { requireKeyword })
  if (duration) return duration
  return allowLabels ? normalizeExperienceLabel(value) : null
}

const extractQualificationSnippet = (value) => {
  const text = stripTags(value)
  if (!text) return null
  return normalizeWhitespace(
    extractFirst(
      /([^.]*\b(?:bachelor|master|degree|b\.tech|b\.e\.|m\.tech|mba)\b[^.]*\.)/i,
      text,
    ),
  )
}

const normalizeQualificationRequirement = (value) => {
  const normalized = normalizeWhitespace(value)
  if (!normalized) return null
  return /\b(bachelor|master|degree|b\.tech|b\.e\.|m\.tech|mba)\b/i.test(normalized)
    ? normalized
    : null
}

const normalizeSkills = (value = []) => [...new Set(
  (Array.isArray(value) ? value : [])
    .map((item) => normalizeWhitespace(item))
    .filter(Boolean),
)]

const extractListItems = (value) => [...String(value ?? '').matchAll(/<li>([\s\S]*?)<\/li>/gi)]
  .map((match) => stripTags(match[1]))
  .filter(Boolean)

const extractRequiredSkillsFromDescription = (value) => {
  const decoded = decodeHtmlEntities(value)
  const skillsSection = extractFirst(
    /Required Skills<\/strong><\/p>\s*<ul>([\s\S]*?)<\/ul>/i,
    decoded,
  )

  return [...new Set(extractListItems(skillsSection))]
}

const extractJobPostingJsonLd = (html) => {
  for (const match of String(html).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = normalizeWhitespace(match[1])
    if (!raw || !raw.includes('"JobPosting"')) continue
    const parsed = parseJson(raw)
    if (parsed?.['@type'] === 'JobPosting') {
      return parsed
    }
  }

  return null
}

const getPrimaryJobLocation = (jobPosting) => {
  const primaryLocation = Array.isArray(jobPosting?.jobLocation)
    ? jobPosting.jobLocation[0]
    : jobPosting?.jobLocation

  const address = primaryLocation?.address
  if (!address) return {}

  const location = [address.addressLocality, address.addressRegion, address.addressCountry]
    .filter(Boolean)
    .join(', ')

  return {
    location: normalizeWhitespace(location),
    city: normalizeWhitespace(address.addressLocality),
    country: normalizeWhitespace(address.addressCountry),
  }
}

const extractPhAppDdo = (html) => parseJson(
  extractJsonObjectAfterMarker(html, 'phApp.ddo = '),
)

const slugifyTitle = (title) => normalizeWhitespace(title)
  ?.normalize('NFKD')
  .replace(/[^\w\s-]/g, '')
  .replace(/_/g, ' ')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || null

export const createPhenomScraper = ({
  companyName,
  source,
  baseUrl,
  searchPath = '/global/en/search-results',
  jobPathPrefix,
  listingPredicate,
  scraperDir,
  targetCountry = 'India',
}) => {
  const config = loadConfig(scraperDir)

  const toAbsoluteUrl = (value) => {
    try {
      return new URL(value, baseUrl).toString()
    } catch {
      return null
    }
  }

  const extractCity = (location, fallback) => {
    const normalized = normalizeWhitespace(fallback || location)
    if (!normalized) return null
    return normalized.split(',')[0]?.trim() || null
  }

  const normalizeEmploymentType = (value) => {
    const candidate = Array.isArray(value) ? value[0] : value
    const normalized = normalizeWhitespace(candidate)
    if (!normalized) return null

    if (/intern/i.test(normalized)) return 'Internship'
    if (/temporary|contract/i.test(normalized)) return 'Contract'
    if (/part[\s-]?time/i.test(normalized)) return null
    if (/full[\s_-]?time|permanent/i.test(normalized)) return 'Full-time'
    return normalized
  }

  const countryParts = value => (normalizeWhitespace(value) || '').split(/\s*\/\s*/).filter(Boolean)
  const countryMatchesTarget = value => {
    const parts = countryParts(value)
    return parts.length > 0 && parts.every(part => part.toLowerCase() === targetCountry.toLowerCase())
  }
  const countryIsUnknown = value => {
    const parts = countryParts(value)
    return !parts.length || parts.some(part => /^(?:remote|global|worldwide|unknown|multiple locations?)$/i.test(part))
      || !countryMatchesTarget(value) && parts.some(part => part.toLowerCase() === targetCountry.toLowerCase())
  }
  const resolveListingScope = raw => {
    const locations = [...new Set([
      ...(Array.isArray(raw.multi_location) ? raw.multi_location : []),
      ...(Array.isArray(raw.multi_location_array) ? raw.multi_location_array.map(item => item?.location) : []),
    ].filter(value => typeof value === 'string').map(normalizeWhitespace).filter(Boolean))]
    const targetLocations = locations.filter(location => countryMatchesTarget(location.split(',').at(-1)))
    const target = countryMatchesTarget(raw.country) || targetLocations.length > 0
    const primary = normalizeWhitespace(raw.cityStateCountry || raw.location || raw.cityState)
    const location = targetLocations[0] || primary || (target ? targetCountry : null)
    return { target, unknown: !target && countryIsUnknown(raw.country), location, locations }
  }
  const getTargetCountryCount = aggregationValue => {
    if (!aggregationValue || typeof aggregationValue !== 'object') return null
    const matches = Object.entries(aggregationValue).filter(([country]) => countryMatchesTarget(country))
    return matches.length && matches.every(([, count]) => Number.isInteger(count) && count >= 0)
      ? matches.reduce((sum, [, count]) => sum + count, 0) : null
  }

  const resolveJobPathPrefix = () => {
    if (jobPathPrefix) return jobPathPrefix

    const matchedPrefix = String(searchPath).match(/^\/(?:[a-z]{2}|global)\/[a-z]{2}(?=\/|$)/i)
    if (matchedPrefix) return matchedPrefix[0]

    return '/global/en'
  }

  const buildSearchResultsPageUrl = (from = 0) => {
    const url = new URL(searchPath, baseUrl)
    if (Number.isInteger(from) && from > 0) {
      url.searchParams.set('from', String(from))
    }
    return url.toString()
  }

  const buildJobDetailUrl = (listing = {}) => toAbsoluteUrl(
    `${resolveJobPathPrefix()}/job/${listing.reqId || listing.jobId}/${slugifyTitle(listing.title)}`,
  )

  const extractSearchPayload = (html) => {
    const ddo = extractPhAppDdo(html)
    const payload = ddo?.eagerLoadRefineSearch || ddo?.targetedJobs || {}
    if (!Array.isArray(payload.data?.jobs) && !Array.isArray(payload.jobs)) throw incompleteSnapshot('unrecognized jobs payload')
    const jobs = Array.isArray(payload.data?.jobs)
      ? payload.data.jobs
      : (Array.isArray(payload.jobs) ? payload.jobs : [])

    return {
      widgetApiEndpoint: normalizeWhitespace(
        ddo?.siteConfig?.data?.refineSearchAPIUrl
          || ddo?.siteConfig?.data?.widgetApiEndpoint
          || extractFirst(/"widgetApiEndpoint":"([^"]+)"/i, html),
      ),
      totalHits: Number.isInteger(payload.totalHits) ? payload.totalHits : null,
      hits: Number.isInteger(payload.hits) ? payload.hits : null,
      jobs,
      aggregations: normalizeAggregationMap(payload.data?.aggregations || payload.aggregations),
    }
  }

  const extractSearchResults = (payload = {}) => (payload.jobs || [])
    .filter((job) => (typeof listingPredicate === 'function' ? listingPredicate(job) : true))
    .map((job) => {
      const sourceUrl = buildJobDetailUrl(job)
      const location = normalizeWhitespace(job.cityStateCountry || job.location || job.cityState)
      const description = normalizeWhitespace(
        job.ml_highlight || job.descriptionTeaser || job.ml_job_parser?.descriptionTeaser || null,
      )

      if (!job?.reqId || !job?.title || !sourceUrl) return null

      return {
        title: normalizeWhitespace(job.title),
        location,
        city: extractCity(location, job.city),
        country: normalizeWhitespace(job.country),
        jobId: normalizeWhitespace(job.jobId || job.reqId),
        requisitionId: normalizeWhitespace(job.reqId || job.jobId),
        department: normalizeWhitespace(job.category),
        employmentType: normalizeEmploymentType(job.type),
        experienceRequired: extractExperienceSnippet(job.experience, {
          requireKeyword: false,
          allowLabels: true,
        }),
        jobDescription: description,
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: normalizeSkills(job.ml_skills),
        postingDate: normalizeWhitespace(job.postedDate || job.dateCreated),
        applyUrl: normalizeWhitespace(job.applyUrl),
        sourceUrl,
      }
    })
    .filter(Boolean)

  const extractStructuredJobDetail = (html) => {
    const ddo = extractPhAppDdo(html)
    return ddo?.jobDetail?.data?.job || null
  }

  const extractJobDetail = (html, listing = {}) => {
    const structuredJob = extractStructuredJobDetail(html)
    const jobPosting = extractJobPostingJsonLd(html)
    const primaryLocation = getPrimaryJobLocation(jobPosting)
    const rawDescription = structuredJob?.ml_Description || jobPosting?.description || null
    const richDescription = jobPosting?.description || null
    const sourceUrl = listing.sourceUrl
      || normalizeWhitespace(
        extractFirst(/<link rel="canonical" href="([^"]+)"/i, html),
      )
      || normalizeWhitespace(jobPosting?.hiringOrganization?.url)

    const description = stripTags(rawDescription)
    const requiredSkills = extractRequiredSkillsFromDescription(richDescription)
    const explicitExperienceSentence = structuredJob?.experience_sentences?.[0]
    const explicitExperienceLabel = normalizeExperienceLabel(explicitExperienceSentence)
    const experienceRequired = explicitExperienceLabel === 'No experience required'
      ? explicitExperienceLabel
      : (
          extractExperienceSnippet(explicitExperienceSentence, {
            requireKeyword: false,
          })
          || extractExperienceSnippet(structuredJob?.experience, {
            requireKeyword: false,
          })
          || extractExperienceSnippet(description)
          || explicitExperienceLabel
          || normalizeExperienceLabel(structuredJob?.experience)
        )

    return {
      title: normalizeWhitespace(
        jobPosting?.title || structuredJob?.title || listing.title,
      ),
      location: normalizeWhitespace(
        listing.location || structuredJob?.location || primaryLocation.location,
      ),
      city: normalizeWhitespace(
        listing.city || structuredJob?.city || primaryLocation.city || extractCity(listing.location),
      ),
      country: normalizeWhitespace(
        listing.country || structuredJob?.ml_country || structuredJob?.standardisedCountry || primaryLocation.country,
      ),
      jobId: normalizeWhitespace(
        structuredJob?.jobId || listing.jobId,
      ),
      requisitionId: normalizeWhitespace(
        structuredJob?.reqId || structuredJob?.jobId || listing.requisitionId || listing.jobId,
      ),
      department: normalizeWhitespace(
        listing.department || structuredJob?.category || jobPosting?.occupationalCategory,
      ),
      employmentType: normalizeEmploymentType(
        structuredJob?.job_type_fields?.job_type
          || structuredJob?.employmentType
          || structuredJob?.type
          || jobPosting?.employmentType,
      ),
      experienceRequired,
      jobDescription: description,
      minimumQualification: normalizeQualificationRequirement(
        structuredJob?.education_sentences?.[0],
      ) || extractQualificationSnippet(description),
      preferredQualification: null,
      requiredSkills: normalizeSkills(
        requiredSkills.length
          ? requiredSkills
          : (structuredJob?.skills_sentences?.length
              ? structuredJob.skills_sentences
              : structuredJob?.ml_skills)
      ),
      postingDate: normalizeWhitespace(
        jobPosting?.datePosted || structuredJob?.postedDate || listing.postingDate,
      ),
      applyUrl: normalizeWhitespace(structuredJob?.applyUrl || listing.applyUrl || sourceUrl),
      sourceUrl,
      publicExperienceChecked: Boolean(sourceUrl && (structuredJob || jobPosting || description)),
    }
  }

  const fetchText = (url, { signal } = {}) => fetchTextWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    attempts: config.retryAttempts || 1,
    baseDelayMs: config.retryBaseDelayMs || 1000,
    label: source,
    signal,
    timeoutMs: config.fetchTimeoutMs || DEFAULT_FETCH_TIMEOUT_MS,
  })

  const resolveWidgetRequest = html => {
    const searchUrl = new URL(searchPath, baseUrl)
    // Preserve supported keyword scope; arbitrary filters still use their original HTML route.
    if ([...searchUrl.searchParams.keys()].some(key => key !== 'keywords')
      || searchUrl.searchParams.getAll('keywords').length > 1
      || searchUrl.hash || !searchUrl.pathname.endsWith('/search-results')) return null
    const app = parseJson(extractJsonObjectAfterMarker(html, 'var phApp = phApp || '))
    if (!app?.widgetApiEndpoint || !app.locale || !app.deviceType || !app.country || app.pageName !== 'search-results') return null
    try {
      const url = new URL(app.widgetApiEndpoint)
      if (url.origin !== new URL(baseUrl).origin || url.pathname !== '/widgets' || url.search || url.hash) return null
      const countryAggregation = extractSearchPayload(html).aggregations.country || {}
      const countries = Object.keys(countryAggregation).filter(countryMatchesTarget)
      // Fetch a bounded country inventory in one page when possible to avoid overlaps at date-sort ties.
      const pageSize = Math.min(500, Math.max(100, getTargetCountryCount(countryAggregation) ?? 0))
      const sortField = normalizeWhitespace(extractPhAppDdo(html)?.siteConfig?.data?.refineSearch?.sort?.field) || 'postedDate'
      return { url: url.toString(), body: { lang: app.locale, deviceType: app.deviceType, country: app.country,
        pageName: app.pageName, ddoKey: 'refineSearch', jobs: true, counts: true, all_fields: ['country'], size: pageSize,
        global: true, keywords: searchUrl.searchParams.get('keywords') || '', sortBy: 'Most recent', sort: { field: sortField, order: 'desc' },
        ...(countries.length ? { selected_fields: { country: countries } } : {}),
      } }

    } catch { return null }
  }
  const fetchWidgetJson = (url, options = {}) => fetchJsonWithRetry(url, {
    ...options,
    attempts: config.retryAttempts || 1,
    baseDelayMs: config.retryBaseDelayMs || 1000,
    label: source + ' Phenom listings',
    timeoutMs: config.fetchTimeoutMs || DEFAULT_FETCH_TIMEOUT_MS,
  })

  const run = async (options = {}) => {
    const getPage = options.fetchText || fetchText
    const signal = options.signal
    signal?.throwIfAborted()
    // The central maxPages setting belongs to DOM scrapers, not this API-backed inventory.
    const maxPages = Number.isInteger(options.maxPages) ? Math.max(0, options.maxPages)
      : Number.isInteger(config.phenomMaxPages) ? Math.max(0, config.phenomMaxPages) : Infinity
    const maxJobs = Number.isInteger(options.maxJobs) ? Math.max(0, options.maxJobs) : Infinity
    const listingBudgetMs = nonnegativeBudget(options.listingBudgetMs ?? process.env.PHENOM_LISTING_BUDGET_MS, DEFAULT_LISTING_BUDGET_MS)
    const detailBudgetMs = nonnegativeBudget(options.detailEnrichmentBudgetMs ?? process.env.PHENOM_DETAIL_ENRICHMENT_BUDGET_MS, DEFAULT_DETAIL_BUDGET_MS)
    if (maxPages === 0 || maxJobs === 0) throw incompleteSnapshot('nonpositive listing limit cannot establish an empty inventory')
    const seenRawIds = new Set()
    const targetListings = []
    let offset = Number.isInteger(options.initialFrom) ? Math.max(0, options.initialFrom) : 0
    let totalHits = null
    let targetCountryCount = null
    let complete = false
    let uncertainScope = offset > 0
    let budgetExpired = false
    let widgetRequest = null
    const useWidgetApi = options.useWidgetApi ?? Boolean(options.fetchJson || !options.fetchText)
    const listingController = new AbortController()
    const listingSignal = signal ? AbortSignal.any([signal, listingController.signal]) : listingController.signal
    const listingTimer = setTimeout(() => {
      budgetExpired = true
      listingController.abort(incompleteSnapshot('listing budget expired'))
    }, listingBudgetMs)
    try {
      for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
        let payload
        let pageHtml
        if (!widgetRequest) {
          pageHtml = await requestWithSignal(getPage, buildSearchResultsPageUrl(offset), listingSignal)
          if (pageNumber === 0 && useWidgetApi) widgetRequest = resolveWidgetRequest(pageHtml)
        }
        if (widgetRequest) {
          const response = await requestWithSignal(options.fetchJson || fetchWidgetJson, widgetRequest.url, listingSignal, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ ...widgetRequest.body, from: offset }),
          })
          const data = response?.refineSearch
          if (data?.status !== 200 || !Array.isArray(data?.data?.jobs)) throw incompleteSnapshot('invalid widget listing payload')
          payload = { jobs: data.data.jobs, totalHits: data.totalHits, hits: data.hits, aggregations: normalizeAggregationMap(data.data.aggregations) }
        } else {
          payload = extractSearchPayload(pageHtml)
        }
        if (!Number.isInteger(payload.totalHits) || payload.totalHits < 0) throw incompleteSnapshot('unrecognized listing payload or total')
        totalHits = Math.max(totalHits ?? 0, payload.totalHits)
        const count = getTargetCountryCount(payload.aggregations?.country)
        if (count != null) targetCountryCount = Math.max(targetCountryCount ?? 0, count)
        const rawJobs = payload.jobs
        if (!rawJobs.length) {
          if (totalHits === 0 && !seenRawIds.size && !(targetCountryCount > 0)) { complete = true; break }
          throw incompleteSnapshot('empty page at offset ' + offset + ' after ' + seenRawIds.size + ' unique records of ' + totalHits)
        }
        let added = 0
        for (const raw of rawJobs) {
          const rawId = normalizeWhitespace(raw?.jobSeqNo || raw?.jobId || raw?.reqId)
          if (!rawId || !normalizeWhitespace(raw?.reqId) || !normalizeWhitespace(raw?.title)) throw incompleteSnapshot('malformed listing identity')
          if (seenRawIds.has(rawId)) continue
          seenRawIds.add(rawId)
          added += 1
          const scope = resolveListingScope(raw)
          if (scope.unknown) uncertainScope = true
          if (!scope.target) continue
          const scopedRaw = { ...raw, country: targetCountry, cityStateCountry: scope.location,
            city: scope.location ? extractCity(scope.location) : raw.city }
          if (typeof listingPredicate === 'function' && !listingPredicate(scopedRaw)) continue
          const [listing] = extractSearchResults({ jobs: [scopedRaw] })
          if (!listing) throw incompleteSnapshot('unparsed target-country listing')
          targetListings.push({ ...listing, country: targetCountry, ...(scope.locations.length > 1 ? { locations: scope.locations } : {}) })
        }
        if (!added) throw incompleteSnapshot('duplicate page before inventory completion')
        if (seenRawIds.size > totalHits) throw incompleteSnapshot('reported total is smaller than the unique listing inventory')
        offset += rawJobs.length
        if (seenRawIds.size === totalHits) {
          complete = true
          if (typeof listingPredicate !== 'function' && targetCountryCount != null && targetListings.length < targetCountryCount) uncertainScope = true
          break
        }
        // An overlapping final page can exhaust the advertised offsets without
        // yielding every unique ID. Keep verified jobs, but mark the inventory
        // incomplete so persistence preserves roles absent from this snapshot.
        if (offset >= totalHits) break
        if (targetListings.length >= maxJobs) break
      }
    } catch (error) {
      signal?.throwIfAborted()
      if (!budgetExpired || !targetListings.length) throw error
    } finally {
      clearTimeout(listingTimer)
    }
    signal?.throwIfAborted()
    const selected = targetListings.slice(0, maxJobs)
    const incomplete = !complete || uncertainScope || selected.length < targetListings.length
    if (incomplete && !selected.length) throw incompleteSnapshot('no verified target jobs before listing completion')
    if (incomplete) console.warn('[' + source + '] Incomplete Phenom listing; preserving previous vacancies (' + selected.length + ' verified target jobs).')
    const jobs = selected.map(listing => ({
      ...listing, company: companyName, source, link: listing.applyUrl || listing.sourceUrl,
      applyUrl: listing.applyUrl || listing.sourceUrl, publicExperienceChecked: listing.publicExperienceChecked === true,
      ...(incomplete ? { sourceListingComplete: false } : {}), scrapedAt: new Date().toISOString(),
    }))
    if (!jobs.length || detailBudgetMs === 0) return jobs
    const detailController = new AbortController()
    const detailSignal = signal ? AbortSignal.any([signal, detailController.signal]) : detailController.signal
    const detailTimer = setTimeout(() => detailController.abort(new Error('Phenom optional detail budget expired')), detailBudgetMs)
    try {
      for (let index = 0; index < jobs.length; index += 1) {
        if (detailSignal.aborted) break
        const listing = selected[index]
        try {
          const detailHtml = await requestWithSignal(getPage, listing.sourceUrl, detailSignal)
          const structured = extractStructuredJobDetail(detailHtml)
          const posting = extractJobPostingJsonLd(detailHtml)
          // Optional detail HTML must belong to the listing before it can change job identity or fields.
          const identifiers = [structured?.jobId, structured?.reqId].map(normalizeWhitespace).filter(Boolean)
          const expectedIds = [listing.jobId, listing.requisitionId]
          const canonical = normalizeWhitespace(extractFirst(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i, detailHtml))
          if (identifiers.length ? !identifiers.some(id => expectedIds.includes(id))
            : !posting || canonical !== listing.sourceUrl) continue
          const detail = extractJobDetail(detailHtml, listing)
          const enriched = { ...jobs[index] }
          for (const [key, value] of Object.entries(detail)) {
            if (value != null && value !== '' && (!Array.isArray(value) || value.length)) enriched[key] = value
          }
          // The verified listing identity and country remain authoritative.
          enriched.jobId = listing.jobId
          enriched.requisitionId = listing.requisitionId
          enriched.title = listing.title
          enriched.country = listing.country
          enriched.sourceUrl = listing.sourceUrl
          enriched.link = enriched.applyUrl
          jobs[index] = enriched
        } catch (error) {
          signal?.throwIfAborted()
          if (detailSignal.aborted) break
          // Listing collection is complete independently of optional detail availability.
        }
      }
    } finally {
      clearTimeout(detailTimer)
    }
    signal?.throwIfAborted()
    return jobs
  }

  return {
    buildSearchResultsPageUrl,
    buildJobDetailUrl,
    extractSearchPayload,
    extractSearchResults,
    extractJobDetail,
    run,
  }
}
