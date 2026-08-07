export const KHAZANA_JEWELLERY_CATALOG = {
  source: 'khazanajewellery',
  companyName: 'Khazana Jewellery',
  officialBrandName: 'Khazana Jewellery',
  adapter: 'script',
  modulePath: '../khazanajewellery/script.js',
  dryRunFile: 'khazanajewellery/jobs.json',
  homepageUrl: 'https://www.khazanajewellery.com/',
  companyCareerPage: 'https://www.khazanajewellery.com/careers?page_id=33',
  careersApplyEmail: 'careers@khazanajewellery.com',
  atsPlatform: 'official-careers-page-email-only',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-no-listings',
  extractionStrategy: 'verified-careers-policy-page+email-apply-only+no-structured-public-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'khazanajewellery.com',
  verifiedOn: '2026-08-02',
  verifiedPublicPostingCount: 0,
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://www.khazanajewellery.com/careers?page_id=33 remains Khazana Jewellery\'s official careers route. The trustworthy first-party surface is still email-apply only via careers@khazanajewellery.com with no structured public listings, and raw HTTP access can still return a Cloudflare interstitial on the same route. Because there is still no trustworthy public jobs surface, this provider remains a fail-closed sentinel that returns no jobs.',
}

export default KHAZANA_JEWELLERY_CATALOG
