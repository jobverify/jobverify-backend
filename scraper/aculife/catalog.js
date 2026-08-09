export const VERIFIED_SURFACE_SUMMARY =
  'Verified https://www.aculife.co.in/resource/home.aspx, https://www.aculife.co.in/resource/HR.aspx, and https://www.aculife.co.in/resource/career.aspx on July 14, 2026. There is no trustworthy public jobs surface: Aculife exposes a branded first-party HR and resume-submission form, the page is a generic apply form with a free-text "Position you are applying for" field, the linked https://careers.aculife.co.in/ host was not publicly resolvable during live checks, and https://www.aculife.co.in/careers, https://www.aculife.co.in/career, https://www.aculife.co.in/jobs, https://www.aculife.co.in/openings, https://www.aculife.co.in/current-openings, https://www.aculife.co.in/join-us, and https://www.aculife.co.in/work-with-us all returned first-party 404s.'

export const ACULIFE_PROVIDER = {
  source: 'aculife',
  companyName: 'Aculife',
  adapter: 'script',
  modulePath: '../../scraper/aculife/script.js',
  companyCareerPage: 'https://www.aculife.co.in/resource/career.aspx',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-career-form-plus-missing-public-jobs-routes',
  extractionStrategy:
    'verified-official-homepage+verified-first-party-career-form-without-public-job-listings+verified-missing-public-jobs-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'aculife.co.in',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ACULIFE_PROVIDER

