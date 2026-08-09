export const GLANCE_CATALOG = {
  source: 'glance',
  companyName: 'Glance',
  officialBrandName: 'Glance AI',
  adapter: 'script',
  companyCareerPage: 'https://glance.com/careers/latest',
  companyDomain: 'glance.com',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/glance',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/glance/jobs',
  verifiedSampleJobUrl: 'https://glance.com/careers/7443309',
  verifiedPublicJobCount: 39,
  verifiedIndiaJobCount: 25,
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-next-data-page-plus-single-greenhouse-jobs-api',
  extractionStrategy:
    'verified-first-party-careers-page+embedded-next-data-jobs+greenhouse-jobs-api+first-party-detail-route-canonicalization+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: '../../scraper/glance/script.js',
  dryRunFile: 'glance/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://glance.com/careers/latest is the live first-party Glance jobs page, that it embeds public role data in __NEXT_DATA__ and exposes first-party detail routes under https://glance.com/careers/{jobId}, and that the linked Greenhouse feed at https://boards-api.greenhouse.io/v1/boards/glance/jobs?content=true returned 39 live roles and 25 India roles including Applied Scientist III - Recommendation System and Lead - Business Finance.',
}

export default GLANCE_CATALOG

