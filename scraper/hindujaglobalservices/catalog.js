export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.joinhgs.com/in/en is the live first-party HGS India careers landing page, that it links candidates to the public category pages at https://careers.joinhgs.com/India/go/BPM-Jobs-India/7947010/ and https://careers.joinhgs.com/India/go/Digital-Data-And-Analytics-Jobs-India/7947110/, and that those pages expose the public RSS feeds https://careers.joinhgs.com/services/rss/category/?catid=7947010 and https://careers.joinhgs.com/services/rss/category/?catid=7947110. During verification those linked feeds returned 12 India openings in total, including Process Consultant and SAC Planning Consultant.'

export const HINDUJA_GLOBAL_SERVICES_CATALOG = {
  source: 'hindujaglobalservices',
  companyName: 'Hinduja Global Services',
  officialBrandName: 'Hinduja Global Solutions Ltd',
  adapter: 'script',
  modulePath: '../hindujaglobalservices/script.js',
  dryRunFile: 'hindujaglobalservices/jobs.json',
  companyCareerPage: 'https://www.joinhgs.com/in/en',
  companyDomain: 'joinhgs.com',
  bpmCategoryPageUrl: 'https://careers.joinhgs.com/India/go/BPM-Jobs-India/7947010/',
  digitalCategoryPageUrl:
    'https://careers.joinhgs.com/India/go/Digital-Data-And-Analytics-Jobs-India/7947110/',
  bpmJobsRssUrl: 'https://careers.joinhgs.com/services/rss/category/?catid=7947010',
  digitalJobsRssUrl: 'https://careers.joinhgs.com/services/rss/category/?catid=7947110',
  verifiedSampleJobUrl:
    'https://careers.joinhgs.com/India/job/Hyderabad-Process-Consultant-TG-500019/1362905766/',
  verifiedPublicJobCount: 12,
  verifiedIndiaJobCount: 12,
  atsPlatform: 'jobs2web-rss',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-landing-plus-linked-category-rss-feeds',
  extractionStrategy:
    'verified-joinhgs-landing+verified-category-pages+jobs2web-rss-feeds+india-job-normalization',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default HINDUJA_GLOBAL_SERVICES_CATALOG
