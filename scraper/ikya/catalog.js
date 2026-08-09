export const IKYA_CATALOG = {
  source: 'ikya',
  companyName: 'Ikya',
  officialBrandName: 'Ikya',
  adapter: 'script',
  homepageUrl: 'http://www.ikya.com/',
  companyCareerPage: 'https://careers.smartrecruiters.com/Ikya1',
  companyDomain: 'ikya.com',
  atsPlatform: 'smartrecruiters-empty-board',
  countryFilter: 'India',
  paginationStrategy: 'single-smartrecruiters-board-verification-plus-homepage-coming-soon-check',
  extractionStrategy: 'verified-empty-smartrecruiters-board+coming-soon-homepage-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: '../../scraper/ikya/script.js',
  dryRunFile: 'ikya/jobs.json',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that https://careers.smartrecruiters.com/Ikya1 is still the live first-party Ikya public careers board and that it explicitly says "No job postings are currently available." The linked homepage at http://www.ikya.com/ now serves a branded "Coming Soon" HTML placeholder rather than a real company careers site, so this provider still returns an empty array until a trustworthy public jobs surface appears.',
}

export default IKYA_CATALOG

