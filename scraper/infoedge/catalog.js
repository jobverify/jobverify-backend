export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://careers.infoedge.com/infoedge/jobslist is the live first-party InfoEdge jobs surface, that the public Zwayam search API at https://public.zwayam.com/jobs/search accepts TenantGroupId G1 with companyId MTU1Nzg= for careers.infoedge.com, that the public detail API at https://public.zwayam.com/jobs-service/v1/jobs/careersite is live with detail company id 15578, and that the verified search contract returned 303 live jobs including Lead UI Designer at the first-party detail route https://careers.infoedge.com/infoedge/jobview/lead-ui-designer-noida-2026071413401714.'

export const INFOEDGE_CATALOG = {
  source: 'infoedge',
  companyName: 'InfoEdge',
  officialBrandName: 'Info Edge India Ltd',
  adapter: 'script',
  modulePath: '../infoedge/script.js',
  dryRunFile: 'infoedge/jobs.json',
  homepageUrl: 'https://www.infoedgeindia.com/',
  careersLandingUrl: 'https://careers.infoedge.com/infoedge/',
  companyCareerPage: 'https://careers.infoedge.com/infoedge/jobslist',
  companyDomain: 'careers.infoedge.com',
  zwayamTenantGroupId: 'G1',
  zwayamCompanyId: 'MTU1Nzg=',
  zwayamDetailCompanyId: '15578',
  verifiedPublicJobCount: 303,
  verifiedSampleJobUrl:
    'https://careers.infoedge.com/infoedge/jobview/lead-ui-designer-noida-2026071413401714',
  atsPlatform: 'zwayam',
  countryFilter: 'India',
  paginationStrategy: 'public-zwayam-total-count-plus-page-size',
  extractionStrategy: 'verified-first-party-careers-page+public-zwayam-search-api+detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default INFOEDGE_CATALOG
