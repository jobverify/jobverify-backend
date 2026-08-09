export const CAREERS_PAGE_URL = 'https://dtici.daimlertruck.com/career/'
export const SEARCH_API_URL = 'https://global-jobboard-api-jobsearch.daimlertruck.com/search/'
export const DTICI_PARENT_ORGANIZATION_ID = '366989'

const COMPANY_NAME = 'Daimler Truck Innovation Center India (DTICI)'
const SOURCE = 'daimlertruckinnovationcenterindia'

const requestedFields = [
  'PositionTitle',
  'PositionURI',
  'PositionLocation',
  'PositionFormattedDescription',
  'PositionID',
  'PublicationStartDate',
  'PositionSchedule',
  'ParentOrganization',
]

const normalizeWhitespace = (value) => String(value ?? '')
  .replace(/\u00a0/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

const normalizeDescription = (value) => normalizeWhitespace(String(value ?? '')
  .replace(/<(br|\/p|\/div|\/li|\/h[1-6])\b[^>]*>/gi, '\n')
  .replace(/<[^>]+>/g, ' ')) || null

const getDescriptor = (entry) => entry?.MatchedObjectDescriptor || entry || {}

const getLocation = (descriptor) => descriptor.PositionLocation?.[0] || {}

const getApplyUrl = (descriptor) => descriptor.PositionURI
  ? new URL(descriptor.PositionURI, 'https://jobsearch.daimlertruck.com/').href
  : null

const getEmploymentType = (descriptor) => {
  const schedule = descriptor.PositionSchedule?.map((item) => item?.Name).join(' ') || ''
  if (/intern|praktik|ausbildung|apprentice|trainee/i.test(schedule)) return 'Internship'
  if (/teilzeit|part.?time/i.test(schedule)) return 'Part-time'
  if (/contract|befrist/i.test(schedule)) return 'Contract'
  return 'Full-time'
}

export const buildSearchRequest = () => ({
  LanguageCode: '1',
  SearchParameters: {
    FirstItem: 1,
    CountItem: 100,
    Sort: [{ Criterion: 'PublicationStartDate', Direction: 'DESC' }],
    MatchedObjectDescriptor: requestedFields,
  },
  SearchCriteria: [{
    CriterionName: 'ParentOrganization',
    CriterionValue: [DTICI_PARENT_ORGANIZATION_ID],
  }],
})

export const normalizeJob = (entry, scrapedAt) => {
  const descriptor = getDescriptor(entry)
  if (String(descriptor.ParentOrganization) !== DTICI_PARENT_ORGANIZATION_ID) return null

  const jobId = String(descriptor.PositionID || descriptor.ID || entry?.MatchedObjectId || '')
  const title = normalizeWhitespace(descriptor.PositionTitle)
  if (!jobId || !title) return null

  const location = getLocation(descriptor)
  const city = normalizeWhitespace(location.CityName) || null
  const applyUrl = getApplyUrl(descriptor)

  return {
    title,
    company: COMPANY_NAME,
    department: null,
    location: city ? `${city}, India` : 'India',
    city,
    country: 'India',
    jobId,
    requisitionId: jobId,
    sourceUrl: CAREERS_PAGE_URL,
    applyUrl,
    employmentType: getEmploymentType(descriptor),
    experienceRequired: null,
    minimumQualification: null,
    preferredQualification: null,
    requiredSkills: [],
    postingDate: descriptor.PublicationStartDate || null,
    closingDate: descriptor.PublicationEndDate || null,
    jobDescription: normalizeDescription(descriptor.PositionFormattedDescription),
    attachmentUrl: null,
    source: SOURCE,
    link: applyUrl || CAREERS_PAGE_URL,
    scrapedAt,
  }
}

const defaultFetchJson = async (url, options) => {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
  return response.json()
}

export const createDaimlerTruckInnovationCenterIndiaScraper = (options = {}) => ({
  async run() {
    const fetchJson = options.fetchJson || defaultFetchJson
    const requestBody = new URLSearchParams({
      data: JSON.stringify(buildSearchRequest()),
    })
    const payload = await fetchJson(SEARCH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (compatible; JobverifyCareerScraper/1.0)',
      },
      body: requestBody,
    })
    const scrapedAt = (options.now || (() => new Date().toISOString()))()

    return (payload?.SearchResult?.SearchResultItems || [])
      .map((entry) => normalizeJob(entry, scrapedAt))
      .filter(Boolean)
  },
})

export const run = async () => createDaimlerTruckInnovationCenterIndiaScraper().run()
