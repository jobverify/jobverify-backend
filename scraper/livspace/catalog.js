export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.livspace.com/in/careers is the live first-party Livspace careers page and that it hands off to the first-party board at https://careers.livspace.com/livspace/. Verified that the public Zwayam search API at https://public.zwayam.com/jobs/search accepts TenantGroupId G1 with companyId MTU5MTk= for careers.livspace.com, that the public detail API at https://public.zwayam.com/jobs-service/v1/jobs/careersite is live with detail company id 15919, and that the verified search contract exposed 98 public jobs including Cluster Manager - Retail Ops at https://careers.livspace.com/livspace/jobview/cluster-manager-retail-ops-pune-maharashtra-2026051109291415.'

export const LIVSPACE_CATALOG = {
  source: 'livspace',
  companyName: 'Livspace',
  officialBrandName: 'Livspace',
  adapter: 'script',
  modulePath: '../livspace/script.js',
  dryRunFile: 'livspace/jobs.json',
  homepageUrl: 'https://www.livspace.com/',
  companyCareerPage: 'https://www.livspace.com/in/careers',
  careersLandingUrl: 'https://careers.livspace.com/livspace/',
  jobsListUrl: 'https://careers.livspace.com/livspace/jobslist',
  zwayamDomain: 'careers.livspace.com',
  zwayamTenantGroupId: 'G1',
  zwayamCompanyId: 'MTU5MTk=',
  zwayamDetailCompanyId: '15919',
  verifiedPublicJobCount: 98,
  verifiedSampleJobTitle: 'Cluster Manager - Retail Ops',
  verifiedSampleJobUrl:
    'https://careers.livspace.com/livspace/jobview/cluster-manager-retail-ops-pune-maharashtra-2026051109291415',
  companyDomain: 'livspace.com',
  atsPlatform: 'zwayam',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-zwayam-total-count-plus-page-size',
  extractionStrategy: 'verified-official-careers-page+zwayam-board-shell+public-zwayam-search-api+detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default LIVSPACE_CATALOG
