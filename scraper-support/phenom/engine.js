import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry } from '../utils/fetch.js'

const DEFAULT_FETCH_TIMEOUT_MS = 15000

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

  const countryMatchesTarget = (value) => {
    const normalizedValue = normalizeWhitespace(value)
    const normalizedTarget = normalizeWhitespace(targetCountry)
    if (!normalizedValue || !normalizedTarget) return false
    return normalizedValue.toLowerCase() === normalizedTarget.toLowerCase()
  }

  const getTargetCountryCount = (aggregationValue) => {
    if (!aggregationValue || typeof aggregationValue !== 'object') return null

    for (const [countryName, count] of Object.entries(aggregationValue)) {
      if (countryMatchesTarget(countryName) && Number.isInteger(count)) {
        return count
      }
    }

    return null
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

  const run = async (options = {}) => {
    const getPage = options.fetchText || fetchText
    const signal = options.signal
    const maxPages = Number.isInteger(options.maxPages)
      ? options.maxPages
      : (Number.isInteger(config.maxPages) ? config.maxPages : Number.POSITIVE_INFINITY)
    const maxJobs = Number.isInteger(options.maxJobs)
      ? options.maxJobs
      : Number.POSITIVE_INFINITY

    const jobs = []
    const seenJobIds = new Set()
    let offset = Number.isInteger(options.initialFrom) ? options.initialFrom : 0
    let targetCountryCount = null
    let totalHits = null

    for (let pageNumber = 0; pageNumber < maxPages; pageNumber += 1) {
      const pageHtml = await getPage(buildSearchResultsPageUrl(offset), { signal })
      const payload = extractSearchPayload(pageHtml)
      const listings = extractSearchResults(payload)
      const rawJobsCount = Array.isArray(payload.jobs) ? payload.jobs.length : 0
      const pageSize = payload.hits || rawJobsCount || listings.length

      if (!pageSize || (rawJobsCount === 0 && listings.length === 0)) break

      totalHits = payload.totalHits ?? totalHits
      targetCountryCount = getTargetCountryCount(payload.aggregations?.country) ?? targetCountryCount

      for (const listing of listings) {
        if (!countryMatchesTarget(listing.country)) continue
        if (seenJobIds.has(listing.jobId)) continue
        seenJobIds.add(listing.jobId)

        const detailHtml = await getPage(listing.sourceUrl, { signal })
        const detail = extractJobDetail(detailHtml, listing)

        jobs.push({
          jobId: detail.jobId || listing.jobId,
          requisitionId: detail.requisitionId || listing.requisitionId,
          title: detail.title || listing.title,
          company: companyName,
          department: detail.department || listing.department,
          location: detail.location || listing.location,
          city: detail.city || listing.city,
          country: detail.country || listing.country,
          link: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
          applyUrl: detail.applyUrl || listing.applyUrl || listing.sourceUrl,
          sourceUrl: detail.sourceUrl || listing.sourceUrl,
          source,
          employmentType: detail.employmentType || listing.employmentType,
          experienceRequired: detail.experienceRequired || listing.experienceRequired,
          publicExperienceChecked: detail.publicExperienceChecked === true || listing.publicExperienceChecked === true,
          jobDescription: detail.jobDescription || listing.jobDescription,
          minimumQualification: detail.minimumQualification,
          preferredQualification: detail.preferredQualification,
          requiredSkills: detail.requiredSkills?.length
            ? detail.requiredSkills
            : listing.requiredSkills,
          postingDate: detail.postingDate || listing.postingDate,
          scrapedAt: new Date().toISOString(),
        })

        if (jobs.length >= maxJobs) return jobs
        if (Number.isInteger(targetCountryCount) && jobs.length >= targetCountryCount) return jobs
      }

      offset += pageSize
      if (Number.isInteger(totalHits) && offset >= totalHits) break
    }

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
