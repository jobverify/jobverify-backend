export const provider = {
  source: 'appypie',
  companyName: 'Appy Pie',
  officialBrandName: 'Appy Pie',
  adapter: 'script',
  modulePath: '../appypie/script.js',
  homepageUrl: 'https://www.appypie.com/',
  companyCareerPage: 'https://careers.appypie.com/careers',
  atsPlatform: 'wordpress-simple-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-job-board-page-plus-detail-pages',
  extractionStrategy: 'verified-first-party-job-board+detail-page-jsonld+visible-detail-metadata+india-only-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'careers.appypie.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.appypie.com/careers was the live first-party Appy Pie job board, linked to public role pages such as https://careers.appypie.com/careers/driver-cum-runner, and that the detail page exposed first-party JobPosting JSON-LD plus visible metadata including Noida, Administration, Permanent, and JR407.',
  dryRunFile: 'appypie/jobs.json',
}

export default provider
