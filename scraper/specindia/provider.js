export const provider = {
  source: 'specindia',
  companyName: 'SPEC INDIA',
  officialBrandName: 'SPEC INDIA',
  adapter: 'script',
  modulePath: '../../scraper/specindia/script.js',
  homepageUrl: 'https://www.spec-india.com/',
  companyCareerPage: 'https://www.spec-india.com/career/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-current-opening-cards',
  extractionStrategy: 'verified-first-party-careers-page+public-current-opening-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'spec-india.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.spec-india.com/career/ is the live first-party SPEC INDIA careers page and that it exposes public Current Openings cards linking to first-party role pages such as Java Developer (APL), Senior Java Developer, and HR Executive.',
  dryRunFile: 'specindia/jobs.json',
}

export default provider

