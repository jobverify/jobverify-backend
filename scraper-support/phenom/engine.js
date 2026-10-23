import { loadConfig } from '../utils/loadConfig.js'
import { fetchTextWithRetry, fetchJsonWithRetry } from '../utils/fetch.js'
import { attachInventoryEvidence } from '../utils/inventoryEvidence.js'
import { hasSourceDescription } from '../../src/utils/jobSourceContent.js'

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
    .replace(/<!--[\s\S]*?(?:-->|$)|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
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

// Read only active native elements. Scripts inside templates, comments and raw
// text elements cannot establish listing identity or supply a job description.
const nativeElements = value => {
  const html = String(value), scripts = [], links = []
  const tags = /<!--[\s\S]*?(?:-->|$)|<\/?([a-z][a-z0-9:_-]*)\b((?:[^"'<>]|"[^"]*"|'[^']*')*)>/gi
  const raw = new Set(['script', 'style', 'textarea', 'title', 'xmp', 'noscript', 'noembed', 'noframes', 'iframe', 'plaintext'])
  let templateDepth = 0, match
  while ((match = tags.exec(html))) {
    if (!match[1]) continue
    const name = match[1].toLowerCase(), closing = match[0].startsWith('</')
    if (name === 'template') { templateDepth = Math.max(0, templateDepth + (closing ? -1 : 1)); continue }
    if (closing) continue
    const attributes = new Map()
    for (const attr of match[2].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
      const key = attr[1].toLowerCase()
      // Duplicate native identity attributes are ambiguous, even if a browser
      // might select the first one.
      attributes.set(key, attributes.has(key) ? null : decodeHtmlEntities(attr[2] ?? attr[3] ?? attr[4] ?? ''))
    }
    if (raw.has(name)) {
      if (name === 'plaintext') break
      const close = new RegExp('</' + name + '\\s*>', 'gi')
      close.lastIndex = tags.lastIndex
      const end = close.exec(html)
      if (!end) break
      if (name === 'script' && templateDepth === 0 && !attributes.has('src') && !attributes.has('nomodule')) {
        const type = (attributes.get('type') ?? (attributes.has('type') ? 'invalid' : '')).trim().toLowerCase()
        scripts.push({ type, body: html.slice(tags.lastIndex, end.index) })
      }
      tags.lastIndex = close.lastIndex
      continue
    }
    if (name === 'link' && templateDepth === 0) links.push(attributes)
  }
  return { scripts, links }
}

export const extractNativeModel = (html, marker) => {
  const models = []
  for (const { type, body } of nativeElements(html).scripts) {
    if (!['', 'text/javascript', 'application/javascript', 'module'].includes(type)) continue
    // Preserve offsets while masking JS comments and quoted values. A marker
    // appearing in a stale string or a comment is not an assignment.
    const code = body.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\*[\s\S]*?(?:\*\/|$)|\/\/[^\r\n]*|<!--[^\r\n]*/g,
      value => value.replace(/[^\r\n]/g, ' '))
    const pattern = marker === 'ddo'
      ? /\bphApp\s*\.\s*ddo\s*=\s*(?=\{)/g
      : /\bvar\s+phApp\s*=\s*phApp\s*\|\|\s*(?=\{)/g
    for (const assignment of code.matchAll(pattern)) {
      const previous = code.slice(0, assignment.index).trim().at(-1)
      if (previous && !';{}'.includes(previous)) continue
      const json = extractJsonObjectAfterMarker(body.slice(assignment.index + assignment[0].length), '')
      const model = parseJson(json)
      if (!model) throw incompleteSnapshot('invalid active native model')
      models.push(model)
    }
  }
  const unique = new Map(models.map(model => [JSON.stringify(model), model]))
  if (unique.size > 1) throw incompleteSnapshot('conflicting active native models')
  return unique.values().next().value || null
}

const extractCanonical = html => {
  const urls = nativeElements(html).links.filter(attrs => attrs.get('rel')?.toLowerCase().split(/\s+/).includes('canonical'))
    .map(attrs => attrs.get('href'))
  if (urls.some(url => typeof url !== 'string') || new Set(urls).size > 1) throw incompleteSnapshot('conflicting native canonical links')
  return urls[0] || null
}

const parseJson = (value) => {
  if (!value) return null

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })
const knownCountries = new Map()
for (let first = 65; first <= 90; first += 1) for (let second = 65; second <= 90; second += 1) {
  const code = String.fromCharCode(first, second), name = regionNames.of(code)
  if (name !== code && !['ZZ', 'EU', 'EZ', 'UN', 'XA', 'XB', 'QO'].includes(code)) {
    knownCountries.set(code.toLowerCase(), code)
    knownCountries.set(name.toLowerCase(), code)
  }
}
for (const [name, code] of Object.entries({ 'united states of america': 'US', usa: 'US',
  uk: 'GB', 'great britain': 'GB', 'czech republic': 'CZ', 'south korea': 'KR',
  'republic of korea': 'KR', 'russian federation': 'RU', 'viet nam': 'VN', 'taiwan, china': 'TW', turkey: 'TR' })) {
  knownCountries.set(name, code)
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
  const postings = []
  for (const script of nativeElements(html).scripts) {
    if (script.type !== 'application/ld+json') continue
    const raw = normalizeWhitespace(script.body)
    if (!raw || !raw.includes('"JobPosting"')) continue
    const parsed = parseJson(raw)
    if (parsed?.['@type'] === 'JobPosting') {
      postings.push(parsed)
    }
  }

  const unique = new Map(postings.map(posting => [JSON.stringify(posting), posting]))
  if (unique.size > 1) throw incompleteSnapshot('conflicting native JobPosting models')
  return unique.values().next().value || null
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

export const extractPhAppDdo = (html) => extractNativeModel(html, 'ddo')

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
  defaultDetailEnrichmentBudgetMs = DEFAULT_DETAIL_BUDGET_MS,
  defaultDetailConcurrency = 1,
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
    if (typeof value !== 'string') return false
    const parts = countryParts(value)
    return parts.length > 0 && parts.every(part => part.toLowerCase() === targetCountry.toLowerCase())
  }
  const countryIsUnknown = value => {
    if (typeof value !== 'string') return true
    const parts = countryParts(value)
    return !parts.length || parts.some(part => !knownCountries.has(part.toLowerCase()))
      || !countryMatchesTarget(value) && parts.some(part => knownCountries.get(part.toLowerCase()) === knownCountries.get(targetCountry.toLowerCase()))
  }
  const locationParts = value => (normalizeWhitespace(value) || '').split(',').map(part => part.trim().normalize('NFC').toLowerCase()).filter(Boolean)
  const countryCode = value => {
    if (typeof value !== 'string') return null
    const parts=countryParts(value).map(part=>knownCountries.get(part.toLowerCase()))
    return parts.length && parts.every(Boolean) && new Set(parts).size===1 ? parts[0] : null
  }
  const prefixAgrees = (parts,full) => parts.length <= full.length && parts.every((part,index)=>part===full[index])
  const resolveDetailLocation = value => {
    if (typeof value === 'string') return { consistent:true,target:countryMatchesTarget(value.split(',').at(-1)) }
    if (!value || typeof value !== 'object' || Array.isArray(value)
      || [value.country,value.city,value.state,value.cityState,value.cityCountry,value.stateCountry,value.location,value.cityStateCountry]
        .some(field=>field!=null && typeof field!=='string')) return {consistent:false,target:false}
    const country = normalizeWhitespace(value.country)
    const full = normalizeWhitespace(value.cityStateCountry || value.location)
    if (!full) return {consistent:Boolean(countryCode(country)),target:countryMatchesTarget(country)}
    const complete = locationParts(full)
    const fullCountry=countryCode(complete.at(-1))
    if (!fullCountry || country && countryCode(country)!==fullCountry) return {consistent:false,target:false}
    const fullPrefix=complete.slice(0,-1),region=complete.slice(1,-1)
    const city = normalizeWhitespace(value.city)
    if (city && !/^not location specific$/i.test(city) && city.normalize('NFC').toLowerCase() !== complete[0]) return {consistent:false,target:false}
    const state=normalizeWhitespace(value.state)
    if (state && !/^not location specific$/i.test(state) && !prefixAgrees(locationParts(state),region)) return {consistent:false,target:false}
    if (normalizeWhitespace(value.cityState) && !prefixAgrees(locationParts(value.cityState),fullPrefix)) return {consistent:false,target:false}
    for(const [field,expected] of [[value.cityCountry,fullPrefix],[value.stateCountry,region]]) {
      if (!normalizeWhitespace(field)) continue
      const parts=locationParts(field)
      if (countryCode(parts.at(-1))!==fullCountry || !prefixAgrees(parts.slice(0,-1),expected)) return {consistent:false,target:false}
    }
    const short = locationParts(value.location)
    if (!short.length) return {consistent:true,target:fullCountry===countryCode(targetCountry)}
    const shortCountry = knownCountries.get(short.at(-1))
    if (shortCountry && shortCountry!==fullCountry) return {consistent:false,target:false}
    const shortPrefix = shortCountry ? short.slice(0,-1) : short
    // An abbreviated native label is usable only alongside the same office's
    // explicit country and full label, with every short component equal.
    if (!shortCountry && (!countryCode(country) || !value.cityStateCountry)) return {consistent:false,target:false}
    const consistent=prefixAgrees(shortPrefix,fullPrefix)
    return {consistent,target:consistent && fullCountry===countryCode(targetCountry)}
  }
  const detailLocationHasTarget = value => resolveDetailLocation(value).target
  const resolveListingScope = raw => {
    const locations = [...new Set([
      ...(Array.isArray(raw.multi_location) ? raw.multi_location : []),
      ...(Array.isArray(raw.multi_location_array) ? raw.multi_location_array.map(item => item?.location) : []),
    ].filter(value => typeof value === 'string').map(normalizeWhitespace).filter(Boolean))]
    const targetLocations = locations.filter(location => countryMatchesTarget(location.split(',').at(-1)))
    const target = countryMatchesTarget(raw.country) || targetLocations.length > 0
    const primary = normalizeWhitespace(raw.cityStateCountry || raw.location || raw.cityState)
    const location = targetLocations[0] || primary || (target ? targetCountry : null)
    return { target, unknown: countryIsUnknown(raw.country), location, locations }
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
    if (payload.status != null && payload.status !== 200 || payload.error || payload.success === false) {
      throw incompleteSnapshot('native listing reported a failure')
    }
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
    const payload = ddo?.jobDetail
    if (payload?.status != null && payload.status !== 200 || payload?.error || payload?.success === false) {
      throw incompleteSnapshot('native detail reported a failure')
    }
    return ddo?.jobDetail?.data?.job || null
  }

  const extractJobDetail = (html, listing = {}) => {
    const structuredJob = extractStructuredJobDetail(html)
    const jobPosting = extractJobPostingJsonLd(html)
    const primaryLocation = getPrimaryJobLocation(jobPosting)
    const rawDescription = [structuredJob?.ml_Description, jobPosting?.description]
      .find(value => typeof value === 'string' && hasSourceDescription({ jobDescription: value })) || null
    const richDescription = typeof jobPosting?.description === 'string' ? jobPosting.description : null
    const sourceUrl = listing.sourceUrl
      || normalizeWhitespace(
        extractCanonical(html),
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
    const app = extractNativeModel(html, 'app')
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
    const detailBudgetMs = nonnegativeBudget(options.detailEnrichmentBudgetMs ?? process.env.PHENOM_DETAIL_ENRICHMENT_BUDGET_MS, defaultDetailEnrichmentBudgetMs)
    const detailConcurrency = Math.min(8, Math.max(1, Math.floor(Number(options.detailConcurrency ?? defaultDetailConcurrency)) || 1))
    if (maxPages === 0 || maxJobs === 0) throw incompleteSnapshot('nonpositive listing limit cannot establish an empty inventory')
    const seenRawIds = new Set()
    const targetListings = []
    const nativeListingSequences = new WeakMap()
    const nativeListingCountries = new WeakMap()
    let offset = Number.isInteger(options.initialFrom) ? Math.max(0, options.initialFrom) : 0
    let totalHits = null
    let targetCountryCount = null
    let complete = false
    let uncertainScope = offset > 0
    let budgetExpired = false
    let widgetRequest = null
    let pagesFetched = 0
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
        pagesFetched += 1
        if (totalHits != null && totalHits !== payload.totalHits) uncertainScope = true
        totalHits = Math.max(totalHits ?? 0, payload.totalHits)
        const count = getTargetCountryCount(payload.aggregations?.country)
        if (count != null) {
          if (targetCountryCount != null && targetCountryCount !== count) uncertainScope = true
          targetCountryCount = Math.max(targetCountryCount ?? 0, count)
        }
        const rawJobs = payload.jobs
        if (!rawJobs.length) {
          if (totalHits === 0 && !seenRawIds.size && !(targetCountryCount > 0)) { complete = true; break }
          throw incompleteSnapshot('empty page at offset ' + offset + ' after ' + seenRawIds.size + ' unique records of ' + totalHits)
        }
        let added = 0
        for (const raw of rawJobs) {
          const nativeSequence = typeof raw?.jobSeqNo === 'string' ? normalizeWhitespace(raw.jobSeqNo) : null
          if (raw?.jobSeqNo != null && !nativeSequence) throw incompleteSnapshot('malformed native listing sequence')
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
          const verifiedListing = { ...listing, country: targetCountry, ...(scope.locations.length > 1 ? { locations: scope.locations } : {}) }
          nativeListingSequences.set(verifiedListing, nativeSequence)
          nativeListingCountries.set(verifiedListing,raw.country)
          targetListings.push(verifiedListing)
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
      sourceListingTeaser: listing.jobDescription,
      jobDescription: null,
      applyUrl: listing.applyUrl || listing.sourceUrl, publicExperienceChecked: listing.publicExperienceChecked === true,
      sourceDetailComplete: false, sourceDetailFailureKind: 'budget-exhausted',
      ...(incomplete ? { sourceListingComplete: false } : {}), scrapedAt: new Date().toISOString(),
    }))
    attachInventoryEvidence(jobs, {
      status: incomplete ? 'discovery-only' : totalHits === 0 ? 'verified-empty' : 'complete-inventory',
      firstParty: true, listingComplete: !incomplete, surface: buildSearchResultsPageUrl(0),
      pagesFetched, reportedTotal: totalHits,
      indiaFacetCount: targetCountryCount ?? (incomplete ? null : targetListings.length),
      verifiedAt: new Date().toISOString(), reason: incomplete ? 'phenom-native-listing-incomplete-or-scope-uncertain'
        : 'phenom-native-total-unique-identities-and-target-scope-reconciled-detail-health-separate',
    })
    if (!jobs.length || detailBudgetMs === 0) return jobs
    const detailController = new AbortController()
    const detailSignal = signal ? AbortSignal.any([signal, detailController.signal]) : detailController.signal
    const detailTimer = setTimeout(() => detailController.abort(new Error('Phenom optional detail budget expired')), detailBudgetMs)
    try {
      let nextDetail = 0
      await Promise.all(Array.from({ length: Math.min(detailConcurrency, jobs.length) }, async () => {
        while (!detailSignal.aborted) {
          const index = nextDetail++
          if (index >= jobs.length) return
          const listing = selected[index]
          try {
            const detailHtml = await requestWithSignal(getPage, listing.sourceUrl, detailSignal)
            const structured = extractStructuredJobDetail(detailHtml)
            const posting = extractJobPostingJsonLd(detailHtml)
            // Optional detail HTML must belong to the listing before it can change job identity or fields.
            const identifiers = [structured?.jobId, structured?.reqId].map(normalizeWhitespace).filter(Boolean)
            const expectedIds = [listing.jobId, listing.requisitionId]
            const listingSequence = nativeListingSequences.get(listing)
            const listingCountryCode=countryCode(nativeListingCountries.get(listing))
            const detailCountryCode=countryCode(structured?.country)
            const standardisedCountryCode=countryCode(structured?.standardisedCountry)
            const primaryCountryConflict=listingCountryCode && detailCountryCode && listingCountryCode!==detailCountryCode
              || detailCountryCode && standardisedCountryCode && detailCountryCode!==standardisedCountryCode
            const matchingNativeSequence = listingSequence && typeof structured?.jobSeqNo === 'string'
              && normalizeWhitespace(structured.jobSeqNo) === listingSequence
            const canonical = normalizeWhitespace(extractCanonical(detailHtml))
            const canonicalUrl = canonical ? new URL(canonical, listing.sourceUrl) : null
            const canonicalId = canonicalUrl?.pathname.split('/job/')[1]?.split('/')[0]
            const postingId = normalizeWhitespace(typeof posting?.identifier === 'string' ? posting.identifier : posting?.identifier?.value)
            const postingLocations = Array.isArray(posting?.jobLocation) ? posting.jobLocation : [posting?.jobLocation]
            const detailLocations = [
              ...(Array.isArray(structured?.multi_location) ? structured.multi_location : []),
              ...(Array.isArray(structured?.multi_location_array) ? structured.multi_location_array : []),
            ]
            const invalidLocationShape = detailLocations.some(value=>!resolveDetailLocation(value).consistent)
            const detailHasTargetLocation = detailLocations.some(detailLocationHasTarget)
            const structuredCountries = [structured?.country, structured?.ml_country, structured?.standardisedCountry]
            const postingCountries = postingLocations.map(location => {
              const country = location?.address?.addressCountry
              return country && typeof country === 'object' && !Array.isArray(country) ? country.name : country
            })
            const invalidCountryShape = [...structuredCountries, ...postingCountries]
              .some(country => country != null && (typeof country !== 'string'
                || country.trim() && countryParts(country).some(part => !knownCountries.has(part.toLowerCase()))))
            const detailCountries = [...structuredCountries, ...postingCountries].filter(value => typeof value === 'string' && value.trim())
            const derivedCountryConflict = countryMatchesTarget(structured?.country) && typeof structured?.ml_country === 'string'
              && structured.ml_country.trim() && !countryMatchesTarget(structured.ml_country)
            const corroboratedIndiaOffices = detailLocations.filter(value => value && typeof value === 'object'
              && countryMatchesTarget(value.country) && countryMatchesTarget(locationParts(value.cityStateCountry).at(-1))
              && detailLocationHasTarget(value))
            const corroboratedDerivedConflict = !derivedCountryConflict || countryMatchesTarget(structured?.standardisedCountry)
              && corroboratedIndiaOffices.length > 0 && corroboratedIndiaOffices.length === detailLocations.length
              && (!posting || postingCountries.length > 0
                && postingCountries.every(country => countryMatchesTarget(country) || /^IN$/i.test(String(country).trim())))
            const targetDetailCountry = !primaryCountryConflict && !invalidCountryShape && !invalidLocationShape && corroboratedDerivedConflict && (detailHasTargetLocation || detailCountries.length > 0
              && detailCountries.every(country => countryMatchesTarget(country)
                || targetCountry === 'India' && /^IN$/i.test(country.trim())))
            if ((identifiers.length ? !identifiers.every(id => expectedIds.includes(id))
              : !posting || canonical !== listing.sourceUrl)
              || postingId && !expectedIds.includes(postingId)
              || structured?.title != null && (typeof structured.title !== 'string' || normalizeWhitespace(structured.title) !== listing.title)
              || posting?.title && normalizeWhitespace(posting.title) !== listing.title
              || structured?.applyUrl != null && (typeof structured.applyUrl !== 'string'
                || normalizeWhitespace(structured.applyUrl) !== (listing.applyUrl || listing.sourceUrl))
              || listingSequence && structured?.jobSeqNo != null && !matchingNativeSequence
              || canonicalUrl && (canonicalUrl.origin !== new URL(listing.sourceUrl).origin
                || !expectedIds.includes(canonicalId) && !(matchingNativeSequence && canonicalId === listingSequence))
              || !targetDetailCountry) {
              jobs[index].sourceDetailFailureKind = 'identity-mismatch'
              continue
            }
            const detail = extractJobDetail(detailHtml, listing)
            if (!hasSourceDescription(detail)) {
              jobs[index].sourceDetailFailureKind = 'missing-content'
              continue
            }
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
            if (derivedCountryConflict) enriched.sourceNativeCountryEvidence = {
              country: structured.country, standardisedCountry: structured.standardisedCountry, ml_country: structured.ml_country,
              nativeIndiaOfficeLabels: corroboratedIndiaOffices.map(value => value.cityStateCountry),
              jsonLdCountries: postingCountries, derivedCountryConflict: true,
            }
            enriched.link = enriched.applyUrl
            enriched.sourceDetailComplete = true
            delete enriched.sourceDetailFailureKind
            jobs[index] = enriched
          } catch (error) {
            signal?.throwIfAborted()
            if (detailSignal.aborted) break
            jobs[index].sourceDetailFailureKind = 'upstream'
            // Listing collection is complete independently of optional detail availability.
          }
        }
      }))
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
