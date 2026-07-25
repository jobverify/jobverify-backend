import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NARAYANA_HEALTH_CATALOG = {
  source: 'narayanahealth',
  companyName: 'Narayana Health',
  officialBrandName: 'Narayana Health',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  siteMapUrl: 'https://www.narayanahealth.org/sitemap',
  companyCareerPage: 'https://jobs.narayanahealth.org/?locale=en_GB',
  officialCareersHandoffUrl: 'https://jobs.narayanahealth.org/viewalljobs/',
  companyDomain: 'narayanahealth.org',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'category-discovery+offset-path',
  extractionStrategy:
    'first-party-sitemap-careers-link+jobs2web-view-all-categories+html-category-rows+detail-pages+filled-role-fallback',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'narayanahealth/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    "Verified on Thursday, July 16, 2026 that https://www.narayanahealth.org/sitemap links Careers directly to Narayana Health's first-party jobs board at https://jobs.narayanahealth.org/?locale=en_GB, and that the public board's category index at https://jobs.narayanahealth.org/viewalljobs/ exposes server-rendered NH-India category pages including Medical Professionals, Paramedical & Admin Professionals, and Experienced Jobs with dated public role rows on jobs.narayanahealth.org.",
}

export default NARAYANA_HEALTH_CATALOG
