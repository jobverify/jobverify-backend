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
  paginationStrategy: 'single-first-party-current-openings-page-via-browser-rendered-html',
  extractionStrategy:
    'verified-first-party-careers-page+browser-rendered-opening-cards+darwinbox-apply-links+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://www.excelra.com/careers/ is still the live exact-name Excelra careers page for the backlog row Excelra Knowledge Solutions, that direct raw HTTP now returns a Cloudflare 403 challenge, and that a normal browser session renders the first-party Current openings cards with visible India roles including Senior DevOps Engineer, Software Tester, and Software Developer in Hyderabad, India. Each visible card still links to an official Excelra Darwinbox detail URL under https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'excelraknowledgesolutions/jobs.json',
}

export default EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
