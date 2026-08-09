export const INNOVAL_DIGITAL_SOLUTIONS_CATALOG = {
  source: 'innovaldigitalsolutions',
  companyName: 'Innoval Digital Solutions',
  officialBrandName: 'Innoval Digital Solutions',
  adapter: 'script',
  modulePath: '../../scraper/innovaldigitalsolutions/script.js',
  companyCareerPage: 'https://www.ivldsp.com/company/',
  companyDomain: 'ivldsp.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-company-page-recruiting-teaser-only',
  extractionStrategy:
    'verified-first-party-company-page+verified-recruiting-teaser+no-trustworthy-inline-openings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that https://www.ivldsp.com/company/ is the live first-party Innoval Digital Solutions company/about surface, that it still exposes Careers and Life @ IVL navigation alongside the SAP BTP company overview, and that the verified exact-name first-party page does not expose a trustworthy inline public openings list to scrape directly.',
  dryRunFile: 'innovaldigitalsolutions/jobs.json',
}

export default INNOVAL_DIGITAL_SOLUTIONS_CATALOG

