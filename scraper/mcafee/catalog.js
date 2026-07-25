import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MCAFEE_CATALOG = {
  source: 'mcafee',
  companyName: 'McAfee',
  officialBrandName: 'McAfee',
  adapter: 'script',
  homepageUrl: 'https://careers.mcafee.com/join',
  companyCareerPage: 'https://careers.mcafee.com/join',
  searchResultsUrl: 'https://careers.mcafee.com/global/en/search-results',
  companyDomain: 'careers.mcafee.com',
  atsPlatform: 'jibe-careers-shell-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'join-page-plus-search-shell-validation',
  extractionStrategy:
    'verified-jibe-careers-shell-plus-non-enumerable-search-surface-in-this-environment+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.mcafee.com/join is the live McAfee careers shell and that it points candidates to /jobs plus footer browse links for Categories and Locations. Anonymous verification also showed the legacy https://careers.mcafee.com/global/en/ route returning HTTP 404 and the public search-results shell rendering a 404-style wrapper with navigation chrome instead of a trustworthily enumerable jobs list in this environment. This exact-name local provider therefore fails closed until McAfee exposes a stable anonymous inventory surface we can verify directly.',
  dryRunFile: 'mcafee/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MCAFEE_CATALOG
