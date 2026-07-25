export const SOURCE = 'kochbusinesssolutions'
export const COMPANY = 'Koch Business Solutions'
export const HOMEPAGE_URL = 'https://www.kochinc.com/'
export const CAREERS_URL = 'https://www.kochinc.com/career-opportunities/koch'
export const SEARCH_JOBS_URL = 'https://koch.avature.net/en_US/careers/SearchJobs?732=26082375&tags=rm.kcm.web.kcm-004'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'Koch Business Solutions',
  adapter: 'script',
  modulePath: '../kochbusinesssolutions/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  searchJobsUrl: SEARCH_JOBS_URL,
  atsPlatform: 'avature',
  countryFilter: 'India',
  paginationStrategy: 'koch-company-page-plus-filtered-avature-pagination',
  extractionStrategy: 'verified-koch-company-page+company-filtered-avature-search-results+jobdetail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'koch.avature.net',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.kochinc.com/career-opportunities/koch linked to a company-filtered Avature board at https://koch.avature.net/en_US/careers/SearchJobs?732=26082375&tags=rm.kcm.web.kcm-004, and that the filtered search results exposed public Koch roles with Bangalore or Bengaluru, Karnataka, India locations plus paginated JobDetail links.',
  dryRunFile: 'kochbusinesssolutions/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Empowering Koch companies with shared expertise/i.test(page)
    && /View open roles/i.test(page)
    && /SearchJobs\?732=26082375/i.test(page)
}

export const extractJobsFromSearchHtml = (html) => {
  const page = String(html ?? '')
  const jobs = []
  const titlePattern = /<a href="(https:\/\/koch\.avature\.net\/en_US\/careers\/JobDetail\/[^"]+)">([^<]+)<\/a>/gi
  let match

  while ((match = titlePattern.exec(page)) !== null) {
    const remainder = page.slice(match.index)
    const locationMatch = remainder.match(/article__header__text__location">([^<]+)</i)
    const title = normalizeWhitespace(match[2])
    const sourceUrl = normalizeWhitespace(match[1])
    const location = normalizeWhitespace(locationMatch?.[1])

    if (!title || !sourceUrl || !location || !/india/i.test(location)) {
      continue
    }

    jobs.push({
      title,
      location,
      sourceUrl,
      applyUrl: sourceUrl,
    })
  }

  return jobs
}

export const run = async ({ fetchText, now = () => new Date().toISOString() } = {}) => {
  const careersPage = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersPage)) {
    throw new Error('Koch Business Solutions verified careers page changed materially')
  }

  const jobs = extractJobsFromSearchHtml(await fetchText(SEARCH_JOBS_URL))
  if (!jobs.length) {
    throw new Error('Koch Business Solutions filtered Avature board no longer exposes trusted India jobs')
  }

  return jobs.map((job) => ({
    ...job,
    company: COMPANY,
    country: 'India',
    link: job.applyUrl,
    source: SOURCE,
    scrapedAt: now(),
  }))
}
