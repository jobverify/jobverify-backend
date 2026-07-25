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
    'verified-first-party-careers-page+inline-role-cards+keka-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.avizva.com/career was the live first-party AVIZVA careers page and publicly listed India openings including Scrum Master, Development Engineer, Lead Engineer, and System Analyst, each with Gurugram and Indore locations plus Apply Now handoffs to avizva.keka.com.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'avizva/jobs.json',
}

export default AVIZVA_CATALOG
