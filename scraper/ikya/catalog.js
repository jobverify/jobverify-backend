export const IKYA_CATALOG = {
  source: 'ikya',
  companyName: 'Ikya',
  officialBrandName: 'Ikya',
  adapter: 'script',
  homepageUrl: 'https://www.ikya.com/',
  companyCareerPage: 'https://careers.smartrecruiters.com/Ikya1',
  companyDomain: 'ikya.com',
  atsPlatform: 'smartrecruiters-empty-board',
  countryFilter: 'India',
  paginationStrategy: 'single-smartrecruiters-board-verification-plus-homepage-placeholder-check',
  extractionStrategy: 'verified-empty-smartrecruiters-board+non-html-homepage-placeholder-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: '../ikya/script.js',
  dryRunFile: 'ikya/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://careers.smartrecruiters.com/Ikya1 is the live first-party Ikya public careers board and that it explicitly says "No job postings are currently available." The linked homepage https://www.ikya.com/ responded as a 2-byte non-HTML placeholder rather than a trustworthy branded site, so this provider fails closed and returns an empty array until a real public jobs surface appears.',
}

export default IKYA_CATALOG
