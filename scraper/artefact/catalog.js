export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, August 13, 2026 that https://www.artefact.com/ and https://www.artefact.com/careers/ currently return the official Artefact BunkerWeb Bot Detection surface from this environment, that the public Greenhouse board at https://job-boards.greenhouse.io/artefact remains the verified public fallback, and that the Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/artefact/jobs?content=true currently exposes 5 India roles in Pune, Maharashtra, India, including https://job-boards.greenhouse.io/artefact/jobs/8360407002 and https://job-boards.greenhouse.io/artefact/jobs/7884340002.'

export const ARTEFACT_CATALOG = {
  source: 'artefact',
  companyName: 'Artefact',
  adapter: 'script',
  modulePath: '../../scraper/artefact/script.js',
  companyCareerPage: 'https://www.artefact.com/careers/',
  homepageUrl: 'https://www.artefact.com/',
  companyDomain: 'artefact.com',
  atsPlatform: 'official-company-careers',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/artefact',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/artefact/jobs?content=true',
  countryFilter: 'India',
  paginationStrategy: 'bunkerweb-blocked-first-party-pages-plus-public-greenhouse-board-api',
  extractionStrategy:
    'verified-bot-detection-first-party-pages+public-greenhouse-board+greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ARTEFACT_CATALOG
