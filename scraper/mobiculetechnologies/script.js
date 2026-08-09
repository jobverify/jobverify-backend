export const SOURCE = 'mobiculetechnologies'
export const COMPANY = 'Mobicule Technologies'
export const HOMEPAGE_URL = 'https://mobicule.com/'
export const CAREERS_URL = 'https://mobicule.com/careers/'
export const CAREERS_PORTAL_URL = 'https://mobicule.zohorecruit.com/jobs/Careers'
export const CAREERS_API_URL =
  'https://mobicule.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Mobicule',
  adapter: 'script',
  modulePath: '../../scraper/mobiculetechnologies/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  careersPortalUrl: CAREERS_PORTAL_URL,
  careersApiUrl: CAREERS_API_URL,
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-handoff-plus-public-zoho-api',
  extractionStrategy: 'verified-first-party-careers-page+branded-zohorecruit-portal+public-job-openings-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'mobicule.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://mobicule.com/careers/ was the live first-party Mobicule careers page and that its Explore opportunities CTA handed applicants to the branded public Zoho Recruit board at https://mobicule.zohorecruit.com/jobs/Careers backed by https://mobicule.zohorecruit.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite. The public jobs payload exposed India openings including Programmer Analyst - Android in Mumbai / Pune.',
  dryRunFile: 'mobiculetechnologies/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

const normalizeEmploymentType = (value) => {
  const normalized = normalizeWhitespace(value).toLowerCase()
  if (!normalized) return null
  if (/intern/.test(normalized)) return 'Internship'
  if (/part.?time/.test(normalized)) return 'Part-time'
  if (/contract|consult/.test(normalized)) return 'Contract'
  if (/full.?time/.test(normalized)) return 'Full-time'
  return normalizeWhitespace(value)
}

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return /<title>\s*Join Us \| Careers At Mobicule Technologies\s*<\/title>/i.test(page)
    && /Where Innovation Meets/i.test(page)
    && /Explore opportunities/i.test(page)
    && page.includes(CAREERS_PORTAL_URL)
}

export const extractIndiaJobs = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .filter((record) => /india/i.test(normalizeWhitespace(record.Country)))
  .map((record) => {
    const title = normalizeWhitespace(record.Posting_Title || record.Job_Opening_Name)
    const location = normalizeWhitespace(
      [record.City, record.State, record.Country].filter(Boolean).join(', '),
    )
    const sourceUrl = normalizeWhitespace(record.$url)
    const jobId = normalizeWhitespace(record.id)

    if (!title || !location || !sourceUrl || !jobId) return null

    return {
      title,
      company: COMPANY,
      location,
      city: normalizeWhitespace(record.City) || null,
      state: normalizeWhitespace(record.State) || null,
      country: normalizeWhitespace(record.Country),
      jobId,
      requisitionId: jobId,
      sourceUrl,
      applyUrl: sourceUrl,
      employmentType: normalizeEmploymentType(record.Job_Type),
      experienceRequired: normalizeWhitespace(record.Work_Experience) || null,
      description: normalizeWhitespace(record.Job_Description) || null,
    }
  })
  .filter(Boolean)

export const run = async ({
  fetchText = async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.text()
  },
  fetchJson = async (url) => {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
    return response.json()
  },
  now = () => new Date().toISOString(),
} = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('Mobicule Technologies verified first-party careers page changed materially')
  }

  const payload = await fetchJson(CAREERS_API_URL)
  if (payload?.code !== 'success' || !Array.isArray(payload?.data)) {
    throw new Error('Mobicule Technologies public Zoho Recruit payload changed materially')
  }

  const jobs = extractIndiaJobs(payload)
  if (!jobs.length) {
    throw new Error('Mobicule Technologies public Zoho Recruit payload no longer exposes India jobs')
  }

  return jobs.map((job) => ({
    ...job,
    link: job.applyUrl || job.sourceUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}

