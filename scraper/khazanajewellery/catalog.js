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
  verifiedOn: '2026-07-16',
  verifiedPublicPostingCount: 0,
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.khazanajewellery.com/careers?page_id=33 is the official Khazana Jewellery careers surface, and that the public page content exposes recruiting policy text plus the email contact careers@khazanajewellery.com instead of structured public job listings. Separate raw HTTP verification on Thursday, July 16, 2026 returned a Cloudflare interstitial for the same route. Because the trustworthy first-party surface is email-apply only, Khazana Jewellery currently has no trustworthy public jobs surface and this provider is a fail-closed sentinel that returns no jobs.',
}

export default KHAZANA_JEWELLERY_CATALOG
