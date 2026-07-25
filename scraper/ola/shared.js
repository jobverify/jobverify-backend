const ORIGIN = 'https://olacareers.turbohire.co'
const CAREER_PAGE_ID = 'e0c1eb37-eb7a-4ca4-bcc5-d59ce4ce9212'
const API_BASE_URL = 'https://thapi.azurewebsites.net'
const NOAUTH_TOKEN_URL = `${API_BASE_URL}/api/token/noauth`
const FILTERED_JOBS_URL = `${API_BASE_URL}/api/careerpagev2/filteredjobs?orgId=${CAREER_PAGE_ID}&pageType=0`
const CAREER_PAGE_URL = `${ORIGIN}/careerpage/${CAREER_PAGE_ID}`

const LIVE_FILTER_BODY = {
  SortByV2: { Key: 'PostedDate', Order: 2 },
  BunitIds: { Value: null, FilterType: 0 },
  Experience: { Value: null, FilterType: 0 },
  JobTypes: { Value: null, FilterType: 0 },
  JobTypeV2: { Value: null, FilterType: 0 },
  Locations: { Value: null, FilterType: 0 },
  CreatedDate: { Value: null, FilterType: 0 },
  Compensation: { Value: null, FilterType: 0 },
  Skills: { Value: null, FilterType: 0 },
  Keyword: '',
  ClientIds: { Value: null, FilterType: 0 },
  Department: '',
  CustomFields: {},
}

const normalizeWhitespace = (value) => {
  if (value == null) return null
  const normalized = String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&ldquo;|&rdquo;/gi, '"')
    .replace(/&#39;|&apos;|&rsquo;|&#8217;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u2012\u2013\u2014\u2015]/g, '-')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return normalized || null
}

const stripTags = (value) => normalizeWhitespace(
  String(value ?? '')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n')
    .replace(/<p\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' '),
)

const formatExperience = (experience = {}) => {
  const min = Number.isFinite(experience?.MinExp) ? experience.MinExp : null
  const max = Number.isFinite(experience?.MaxExp) ? experience.MaxExp : null

  if (min != null && max != null) {
    if (min === max) return `${min} year${min === 1 ? '' : 's'}`
    return `${min}-${max} years`
  }

  if (min != null) return `${min}+ years`
  if (max != null) return `Up to ${max} years`
  return null
}

const parseLocations = (value) => {
  if (!value) return []

  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const extractPrimaryLocation = (value) => {
  const locations = parseLocations(value)
  return normalizeWhitespace(locations[0]?.Address) || null
}

const extractCity = (location) => normalizeWhitespace(String(location ?? '').split(',')[0]) || null

const buildPublicJobUrl = (jobIdObfuscated) => (
  jobIdObfuscated
    ? `${ORIGIN}/job/publicjobs/${jobIdObfuscated}`
    : null
)

const buildPublicHeaders = (accessToken = null) => {
  const headers = {
    Origin: ORIGIN,
    Referer: CAREER_PAGE_URL,
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json, text/plain, */*',
  }

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  return headers
}

const defaultFetchJson = async (url, options = {}) => {
  const response = await fetch(url, {
    method: options.method || 'GET',
    headers: options.headers,
    body: options.body,
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`)
  }

  return response.json()
}

export const extractSearchResults = (payload, { companyName = 'Ola' } = {}) =>
  (Array.isArray(payload?.Result) ? payload.Result : [])
    .map((record) => {
      const title = normalizeWhitespace(record?.JobTitle)
      const location = extractPrimaryLocation(record?.Location)
      const sourceUrl = buildPublicJobUrl(normalizeWhitespace(record?.JobIdObfuscated))

      if (!title || !location || !sourceUrl) return null

      return {
        title,
        company: companyName,
        department: normalizeWhitespace(record?.Department),
        location,
        city: extractCity(location),
        jobId: normalizeWhitespace(record?.JobId),
        requisitionId: normalizeWhitespace(record?.JobCode) || normalizeWhitespace(record?.JobId),
        sourceUrl,
        applyUrl: sourceUrl,
        employmentType: null,
        experienceRequired: formatExperience(record?.Experience),
        minimumQualification: null,
        preferredQualification: null,
        requiredSkills: Array.isArray(record?.Skills)
          ? record.Skills.map((skill) => normalizeWhitespace(skill)).filter(Boolean)
          : [],
        postingDate: normalizeWhitespace(record?.PublishedDate),
        closingDate: normalizeWhitespace(record?.ExpiryDates?.CAREERPAGE),
        jobDescription: stripTags(record?.JobDescV2),
      }
    })
    .filter(Boolean)

export const createTurbohireScraper = ({
  companyName,
  source,
} = {}) => ({
  async run(options = {}) {
    const fetchJson = options.fetchJson || defaultFetchJson

    const tokenPayload = await fetchJson(NOAUTH_TOKEN_URL, {
      method: 'GET',
      headers: buildPublicHeaders(),
    })

    const listingsPayload = await fetchJson(FILTERED_JOBS_URL, {
      method: 'POST',
      headers: {
        ...buildPublicHeaders(tokenPayload?.access_token),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(LIVE_FILTER_BODY),
    })

    return extractSearchResults(listingsPayload, { companyName }).map((job) => ({
      ...job,
      source,
      link: job.applyUrl || job.sourceUrl,
      scrapedAt: new Date().toISOString(),
    }))
  },
})

export {
  API_BASE_URL,
  CAREER_PAGE_ID,
  CAREER_PAGE_URL,
  FILTERED_JOBS_URL,
  LIVE_FILTER_BODY,
  NOAUTH_TOKEN_URL,
  ORIGIN,
}
