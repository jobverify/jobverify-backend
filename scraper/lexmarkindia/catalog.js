export const LEXMARK_INDIA_CATALOG = {
  source: 'lexmarkindia',
  companyName: 'Lexmark India',
  officialBrandName: 'Lexmark India',
  adapter: 'script',
  modulePath: '../../scraper/lexmarkindia/script.js',
  dryRunFile: 'lexmarkindia/jobs.json',
  companyCareerPage: 'https://origin-www.lexmark.com/en_in/careers.html',
  jobSearchUrl: 'https://origin-www.lexmark.com/en_in/careers/job-search.html',
  verifiedSampleJobUrl: 'https://origin-www.lexmark.com/en_in/careers/job-description.143497.html',
  verifiedSampleJobTitle: 'Azure Data Integration Developer',
  companyDomain: 'lexmark.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  verifiedPublicJobCount: 15,
  paginationStrategy:
    'first-party-careers-landing-page-plus-job-search-table-and-linked-job-detail-pages',
  extractionStrategy:
    'verified-first-party-careers-page+job-search-table+linked-job-detail-pages+people-soft-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://origin-www.lexmark.com/en_in/careers.html was the live Lexmark India careers landing page, that https://origin-www.lexmark.com/en_in/careers/job-search.html exposed 15 public jobs, and that linked first-party detail pages such as https://origin-www.lexmark.com/en_in/careers/job-description.143497.html for Azure Data Integration Developer exposed full job detail plus a PeopleSoft apply link.',
}

export default LEXMARK_INDIA_CATALOG

