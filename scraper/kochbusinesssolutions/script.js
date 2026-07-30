import { fetchTextWithRetry } from '../utils/fetch.js'

export const SOURCE = 'kochbusinesssolutions'
export const COMPANY = 'Koch Business Solutions'
export const HOMEPAGE_URL = 'https://www.kochinc.com/'
export const CAREERS_URL = 'https://www.kochinc.com/career-opportunities/koch'
export const SEARCH_JOBS_URL = 'https://koch.avature.net/en_US/careers/SearchJobs?732=26082375&tags=rm.kcm.web.kcm-004'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'

const KNOWN_INDIA_LOCATION_PATTERN = /\b(?:india|bangalore|bengaluru|gurgaon|gurugram|hyderabad|pune|mumbai|chennai|delhi|noida|kolkata|karnataka|maharashtra|tamil nadu|telangana|haryana)\b/i

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

const defaultFetchText = (url) => fetchTextWithRetry(url, {
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  },
  label: SOURCE,
  timeoutMs: 15000,
})

export const hasOfficialCareersSignal = (html) => {
  const page = String(html ?? '')
  return /Empowering Koch companies with shared expertise/i.test(page)
    && /View open roles/i.test(page)
    && /SearchJobs\?732=26082375/i.test(page)
}

export const extractJobsFromSearchHtml = (html) => {
  const page = String(html ?? '')
  const jobs = []

  for (const match of page.matchAll(/<article\b[^>]*class="[^"]*\barticle--result\b[^"]*"[^>]*>[\s\S]*?<\/article>/gi)) {
    const articleHtml = match[0]
    const titleMatch = articleHtml.match(
      /<h3[^>]*class="[^"]*\barticle__header__text__title\b[^"]*"[^>]*>\s*<a href="(https:\/\/koch\.avature\.net\/en_US\/careers\/JobDetail\/[^"]+)">\s*([\s\S]*?)\s*<\/a>/i,
    )
    const locationMatch = articleHtml.match(
      /article__content__field__label">\s*Location:\s*<\/div>\s*<div class="article__content__field__value">\s*([^<]+)\s*<\/div>/i,
    )
    const title = normalizeWhitespace(titleMatch?.[2])
    const sourceUrl = normalizeWhitespace(titleMatch?.[1])
    const location = normalizeWhitespace(locationMatch?.[1])

    if (!title || !sourceUrl || !location || !KNOWN_INDIA_LOCATION_PATTERN.test(location)) {
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

export const run = async ({ fetchText = defaultFetchText, now = () => new Date().toISOString() } = {}) => {
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
