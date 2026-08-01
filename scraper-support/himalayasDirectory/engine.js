const HIMALAYAS_SEARCH_API_URL = 'https://himalayas.app/jobs/api/search'
const DEFAULT_MAX_PAGES = 5

const COMPANY_SUFFIX_PATTERN =
  /\b(private|pvt|ltd|limited|inc|llc|corp|corporation|co|company|group|holdings|global|india|technologies|technology|tech|solutions|systems|services|labs|lab|networks|software)\b/gi

const normalizeForMatch = (value) =>
  String(value || '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const normalizeFuzzy = (value) =>
  normalizeForMatch(value)
    .replace(COMPANY_SUFFIX_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const normalizeSlug = (value) =>
  normalizeForMatch(value)
    .split(/\s+/)
    .filter(Boolean)
    .join('-')

const decodeHtml = (value = '') =>
  String(value)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')

const stripTags = (value = '') =>
  decodeHtml(String(value).replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const getArray = (value) => (Array.isArray(value) ? value : [])

export const buildHimalayasSearchUrl = ({ provider, page = 1 }) => {
  const url = new URL(HIMALAYAS_SEARCH_API_URL)
  url.searchParams.set('q', provider.himalayasSearchQuery || provider.companyName)
  url.searchParams.set('country', 'IN')
  url.searchParams.set('sort', 'recent')
  url.searchParams.set('page', String(page))
  return url.toString()
}

const hasMatchingCompany = (job = {}, provider = {}) => {
  const providerExact = normalizeForMatch(provider.companyName)
  const providerFuzzy = normalizeFuzzy(provider.companyName)
  const jobExact = normalizeForMatch(job.companyName)
  const jobFuzzy = normalizeFuzzy(job.companyName)
  const jobSlug = normalizeSlug(job.companySlug || job.companyName)

  return (
    (provider.himalayasCompanySlug && jobSlug === provider.himalayasCompanySlug)
    || (providerExact && jobExact === providerExact)
    || (providerFuzzy && jobFuzzy === providerFuzzy)
  )
}

const isIndiaEligible = (job = {}) => {
  const restrictions = getArray(job.locationRestrictions)
  if (restrictions.length === 0) return true

  return restrictions.some((restriction) => {
    const values = [
      restriction?.alpha2,
      restriction?.name,
      restriction?.slug,
    ].map((value) => normalizeForMatch(value))

    return values.some((value) => ['in', 'ind', 'india'].includes(value))
  })
}

const formatLocation = (job = {}) => {
  const restrictions = getArray(job.locationRestrictions)
  if (restrictions.length === 0) return 'Worldwide / India eligible'

  return restrictions
    .map((restriction) => restriction?.name || restriction?.alpha2 || restriction?.slug)
    .filter(Boolean)
    .join(', ') || 'India'
}

const deriveCity = (location = '') => {
  if (/bengaluru|bangalore/i.test(location)) return 'Bengaluru'
  if (/hyderabad/i.test(location)) return 'Hyderabad'
  if (/pune/i.test(location)) return 'Pune'
  if (/chennai/i.test(location)) return 'Chennai'
  if (/mumbai/i.test(location)) return 'Mumbai'
  if (/gurugram|gurgaon/i.test(location)) return 'Gurugram'
  if (/noida/i.test(location)) return 'Noida'
  if (/delhi/i.test(location)) return 'Delhi'
  return 'Remote'
}

const deriveRemoteStatus = (location = '') => {
  if (/hybrid/i.test(location)) return 'Hybrid'
  if (/on-?site|office/i.test(location)) return 'On-site'
  return 'Remote'
}

const toIsoDate = (value) => {
  if (value == null || value === '') return null

  const parsed = typeof value === 'number'
    ? new Date(value)
    : new Date(String(value))

  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString().slice(0, 10)
}

const getJobId = (job = {}) => {
  if (job.guid) return String(job.guid)
  if (!job.applicationLink) return null

  try {
    return new URL(job.applicationLink).pathname.split('/').filter(Boolean).pop()
  } catch {
    return job.applicationLink
  }
}

const mapHimalayasJob = ({ job, provider }) => {
  if (!hasMatchingCompany(job, provider) || !isIndiaEligible(job)) return null
  if (!job.title || !job.applicationLink) return null

  const location = formatLocation(job)
  const jobId = getJobId(job)
  const categories = getArray(job.categories)
  const parentCategories = getArray(job.parentCategories)

  return {
    title: job.title,
    company: provider.companyName,
    location,
    city: deriveCity(location),
    country: 'India',
    locations: [location, provider.locationEvidence].filter(Boolean),
    link: job.applicationLink,
    applyUrl: job.applicationLink,
    sourceUrl: job.applicationLink,
    source: provider.source,
    jobId,
    requisitionId: jobId,
    department: categories[0] || parentCategories[0] || null,
    employmentType: job.employmentType || null,
    experienceRequired: getArray(job.seniority).join(', ') || null,
    postingDate: toIsoDate(job.pubDate),
    expiresAt: toIsoDate(job.expiryDate),
    jobDescription: stripTags(job.description || job.excerpt || ''),
    remoteStatus: deriveRemoteStatus(location),
    atsPlatform: provider.atsPlatform || 'himalayas-remote-jobs-api',
    scrapedAt: new Date().toISOString(),
  }
}

export const createAggregateHimalayasSignalJob = ({ provider, sourceUrl }) => {
  const location = provider.locationEvidence || 'India eligible remote'

  return {
    title: `Current remote openings at ${provider.companyName}`,
    company: provider.companyName,
    location,
    city: deriveCity(location),
    country: 'India',
    locations: [location].filter(Boolean),
    link: sourceUrl,
    applyUrl: sourceUrl,
    sourceUrl,
    source: provider.source,
    jobId: `${provider.source}-current-openings`,
    requisitionId: `${provider.source}-current-openings`,
    department: null,
    employmentType: null,
    experienceRequired: null,
    postingDate: null,
    expiresAt: null,
    jobDescription: [
      `${provider.companyName} had current Himalayas hiring evidence for ${provider.exampleOpening || 'an India-eligible remote opening'}.`,
      `Location evidence: ${location}.`,
      `Directory source: ${provider.directorySourceType || 'Himalayas India remote jobs directory'}.`,
      `Verified on ${provider.verifiedOn || 'the workbook checked date'}.`,
    ].join(' '),
    remoteStatus: deriveRemoteStatus(location),
    atsPlatform: provider.atsPlatform || 'himalayas-remote-jobs-api',
    scrapedAt: new Date().toISOString(),
  }
}

const defaultFetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'JobifyScraper/1.0',
    },
  })

  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} for ${url}`)
    error.status = response.status
    throw error
  }

  const contentType = response.headers?.get?.('content-type') || ''
  if (/text\/html/i.test(contentType)) {
    throw new Error(`Expected JSON from ${url} but received HTML`)
  }

  return response.json()
}

export const createHimalayasDirectoryScraper = (provider) => ({
  async run({ fetchJson = defaultFetchJson } = {}) {
    const maxPages = Number.parseInt(provider.maxPages || DEFAULT_MAX_PAGES, 10)
    const jobs = []
    const seen = new Set()
    let seenApiRecords = 0

    try {
      for (let page = 1; page <= maxPages; page += 1) {
        const payload = await fetchJson(buildHimalayasSearchUrl({ provider, page }))
        const records = Array.isArray(payload?.jobs) ? payload.jobs : []
        if (records.length === 0) break

        seenApiRecords += records.length
        for (const record of records) {
          const mapped = mapHimalayasJob({ job: record, provider })
          const key = mapped?.sourceUrl || mapped?.jobId
          if (!mapped || seen.has(key)) continue

          jobs.push(mapped)
          seen.add(key)
        }

        const totalCount = Number.parseInt(payload?.totalCount, 10)
        if (Number.isFinite(totalCount) && seenApiRecords >= totalCount) break
      }
    } catch {
      if (jobs.length > 0) return jobs
    }

    if (jobs.length > 0) return jobs

    return [createAggregateHimalayasSignalJob({
      provider,
      sourceUrl: provider.companyCareerPage,
    })]
  },
})
