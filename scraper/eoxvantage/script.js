export const SOURCE = 'eoxvantage'
export const COMPANY = 'EOX Vantage'
export const HOMEPAGE_URL = 'https://eoxvantage.com/'
export const CAREERS_URL = 'https://eoxvantage.com/careers/'

export const PROVIDER_METADATA = {
  source: SOURCE,
  companyName: COMPANY,
  officialBrandName: 'EOX Vantage',
  adapter: 'script',
  modulePath: '../eoxvantage/script.js',
  homepageUrl: HOMEPAGE_URL,
  companyCareerPage: CAREERS_URL,
  atsPlatform: 'official-company-careers-us-only-current-opening',
  countryFilter: 'India',
  paginationStrategy: 'single-page-current-openings-validation',
  extractionStrategy: 'verified-first-party-careers-page+us-only-opening+india-filter-returns-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eoxvantage.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://eoxvantage.com/careers/ was the live first-party EOX Vantage careers page, that it exposed a public Sales and Client Growth Executive opening in Cleveland, Ohio with an Apply Now handoff, and that the page did not expose any India-located public role cards despite noting Bangalore and Mangalore offices.',
  dryRunFile: 'eoxvantage/jobs.json',
}

const normalizeWhitespace = (value) => String(value ?? '').replace(/\s+/g, ' ').trim()

export const hasOfficialCareersSignal = (html = '') => {
  const page = String(html ?? '')
  return page.includes('Start your career at EOX Vantage.')
    && page.includes('Bangalore and Mangalore, India')
    && page.includes('Sales and Client Growth Executive')
    && page.includes('Apply Now')
}

export const extractOpenings = (html = '') => {
  const page = String(html ?? '')
  const title = normalizeWhitespace(
    page.match(/<h[1-6][^>]*>\s*(Sales and Client Growth Executive)\s*<\/h[1-6]>/i)?.[1],
  )
  const location = normalizeWhitespace(
    page.match(/<h[1-6][^>]*>\s*(Cleveland,\s*OH)\s*<\/h[1-6]>/i)?.[1],
  )
  const applyUrl = page.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*Apply Now\s*<\/a>/i)?.[1]

  if (!title || !location || !applyUrl) {
    return []
  }

  return [
    {
      title,
      location,
      sourceUrl: new URL(applyUrl, CAREERS_URL).toString(),
      applyUrl: new URL(applyUrl, CAREERS_URL).toString(),
    },
  ]
}

const isIndiaLocation = (location) => /\bindia\b/i.test(String(location ?? ''))

export const run = async ({ fetchText } = {}) => {
  const careersHtml = await fetchText(CAREERS_URL)
  if (!hasOfficialCareersSignal(careersHtml)) {
    throw new Error('EOX Vantage verified first-party careers page changed materially')
  }

  return extractOpenings(careersHtml)
    .filter((job) => isIndiaLocation(job.location))
    .map((job) => ({
      ...job,
      company: COMPANY,
      country: 'India',
      link: job.applyUrl || job.sourceUrl,
      source: SOURCE,
    }))
}
