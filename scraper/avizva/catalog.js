import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AVIZVA_CATALOG = {
  source: 'avizva',
  companyName: 'AVIZVA',
  officialBrandName: 'AVIZVA',
  adapter: 'script',
  homepageUrl: 'https://www.avizva.com/',
  companyCareerPage: 'https://www.avizva.com/career',
  careersVendorHost: 'avizva.keka.com',
  companyDomain: 'avizva.com',
  atsPlatform: 'first-party-careers-page-plus-keka-apply-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy:
    'verified-first-party-careers-page+job-boxes-and-legacy-role-cards+keka-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://www.avizva.com/career was the live first-party AVIZVA careers page and publicly listed India openings such as Senior Engineer, Visual Product Design, Senior Python Engineer, and Python Engineer, each with Apply Now handoffs to avizva.keka.com plus Gurugram and Indore India locations.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'avizva/jobs.json',
}

export default AVIZVA_CATALOG
