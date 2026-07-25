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
  careersPortalBaseUrl: 'https://excelra.darwinbox.in/ms/candidatev2/main/careers/',
  companyDomain: 'excelra.com',
  atsPlatform: 'first-party-careers-page-darwinbox-job-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-current-openings-page',
  extractionStrategy:
    'verified-first-party-careers-page+visible-opening-cards+darwinbox-apply-links+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.excelra.com/careers/ was the live exact-name Excelra careers page for the backlog row Excelra Knowledge Solutions, that it exposed a Current openings section with visible cards including Senior Business Analyst, Software Developer, and System Administrator in Hyderabad, India, and that each card linked to an official Excelra Darwinbox detail URL under https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'excelraknowledgesolutions/jobs.json',
}

export default EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
