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
    'verified-wordpress-careers-page+shortcode-opening-cards+darwinbox-apply-links+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary:
    'Verified on Thursday, August 13, 2026 that https://www.excelra.com/careers/ is still the live exact-name Excelra careers page for the backlog row Excelra Knowledge Solutions, that direct raw HTTP now returns a Cloudflare 403 challenge, and that the first-party WordPress API endpoint at https://www.excelra.com/wp-json/wp/v2/pages?slug=careers still exposes the Current openings content with official Darwinbox apply links under https://excelra.darwinbox.in/ms/candidatev2/main/careers/jobDetails/. The verified India-visible roles in the returned content include Senior DevOps Engineer, Software Tester, and Medicinal Chemistry Consultant in Hyderabad, India.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'excelraknowledgesolutions/jobs.json',
}

export default EXCELRA_KNOWLEDGE_SOLUTIONS_CATALOG
