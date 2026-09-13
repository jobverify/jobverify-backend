import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG = {
  source: 'excelraknowledgesolutions',
  companyName: 'Excelra Knowledge Solutions',
  officialBrandName: 'Excelra',
  adapter: 'script',
  homepageUrl: 'https://www.excelra.com/',
  companyCareerPage: 'https://www.excelra.com/careers/',
  careersWordpressApiUrl: 'https://www.excelra.com/wp-json/wp/v2/pages?slug=careers',
  careersPortalBaseUrl: 'https://excelra.darwinbox.in/ms/candidatev2/main/careers/',
  companyDomain: 'excelra.com',
  atsPlatform: 'first-party-wordpress-json-darwinbox-job-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-wordpress-careers-page-endpoint',
  extractionStrategy:
    'verified-wordpress-careers-page+complete-opening-cards+official-darwinbox-applications+explicit-country-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary:
    'Verified September 13, 2026: the first-party WordPress endpoint https://www.excelra.com/wp-json/wp/v2/pages?slug=careers identifies the published Excelra careers page and exposes eleven role cards under Current openings. The cards contain seven India roles and four United States roles. All application links now use https://excelra.darwinbox.in/ms/candidatev2/main/careers/allJobs. Complete card coverage, explicit country scope and stable identities preserve distinct roles sharing that application page; absent experience remains unknown.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'excelraknowledgesolutions/jobs.json',
}

export default EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
