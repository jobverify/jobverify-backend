export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dremio.com/careers/ is Dremio’s live first-party careers landing page, that https://www.dremio.com/careers/job-postings/ is the first-party open roles page, and that the job-postings page embeds Greenhouse through https://boards.greenhouse.io/embed/job_board/js?for=dremio. Verified that the public jobs feed is https://boards-api.greenhouse.io/v1/boards/dremio/jobs?content=true, which returned 6 live roles including Commercial Account Executive - East at https://www.dremio.com/careers/job-postings/?gh_jid=7578193003.'

export const DREMIO_CATALOG = {
  source: 'dremio',
  companyName: 'Dremio',
  adapter: 'script',
  modulePath: '../dremio/script.js',
  companyCareerPage: 'https://www.dremio.com/careers/job-postings/',
  officialCareersLandingUrl: 'https://www.dremio.com/careers/',
  greenhouseEmbedScriptUrl: 'https://boards.greenhouse.io/embed/job_board/js?for=dremio',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/dremio/jobs',
  sampleJobUrl: 'https://www.dremio.com/careers/job-postings/?gh_jid=7578193003',
  atsPlatform: 'greenhouse',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy:
    'verified-first-party-careers-page+verified-first-party-job-postings-page+greenhouse-embed-script+greenhouse-jobs-api+first-party-detail-urls',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'dremio.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DREMIO_CATALOG
