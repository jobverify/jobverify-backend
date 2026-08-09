export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.artefact.com/ is the live official Artefact homepage, that https://www.artefact.com/careers/ is the first-party careers page, and that it exposes first-party paginated listing pages including https://www.artefact.com/careers/explore-our-jobs/page/2/. The current India roles are exposed on first-party detail pages at https://www.artefact.com/job/data-analyst-india-2026/ and https://www.artefact.com/job/data-architect/, with public Greenhouse apply links at https://job-boards.greenhouse.io/artefact/jobs/8360407002 and https://job-boards.greenhouse.io/artefact/jobs/7884340002.'

export const ARTEFACT_CATALOG = {
  source: 'artefact',
  companyName: 'Artefact',
  adapter: 'script',
  modulePath: '../../scraper/artefact/script.js',
  companyCareerPage: 'https://www.artefact.com/careers/',
  homepageUrl: 'https://www.artefact.com/',
  companyDomain: 'artefact.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-first-party-careers-list-pages-plus-detail-pages',
  extractionStrategy:
    'official-homepage+official-careers-page+first-party-list-pages+first-party-detail-pages+greenhouse-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ARTEFACT_CATALOG

