export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.polymedicure.com/careers/ is the live official Polymed careers page and currently exposes only employer-branding copy, the explicit careers email handoff career@polymedicure.com, and a submit-application resume form rather than public job listings. Verified the separate official page at https://www.polymedicure.com/job-opening/ and found it to be stale 2019 shortcode-heavy content with Product Quick Finder and no trustworthy public jobs board. No trustworthy public jobs surface was available for the Polymed exact-name row on the verified date.'

export const POLYMED_CATALOG = {
  source: 'polymed',
  companyName: 'Polymed',
  officialBrandName: 'Poly Medicure Limited',
  adapter: 'script',
  modulePath: '../polymed/script.js',
  dryRunFile: 'polymed/jobs.json',
  homepageUrl: 'https://www.polymedicure.com/',
  companyCareerPage: 'https://www.polymedicure.com/careers/',
  officialJobOpeningUrl: 'https://www.polymedicure.com/job-opening/',
  officialCareersEmail: 'career@polymedicure.com',
  companyDomain: 'polymedicure.com',
  atsPlatform: 'official-company-site-careers-form-no-public-jobs-board',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-validation-only',
  extractionStrategy: 'verified-careers-form+stale-job-opening-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default POLYMED_CATALOG
