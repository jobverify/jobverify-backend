import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IMPRESSICO_BUSINESS_SOLUTIONS_CATALOG = {
  source: 'impressicobusinesssolutions',
  companyName: 'Impressico Business Solutions',
  officialBrandName: 'Impressico Business Solutions',
  adapter: 'script',
  companyCareerPage: 'https://www.impressico.com/career/',
  companyDomain: 'impressico.com',
  atsPlatform: 'official-company-site-inline-openings-and-modals',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-inline-cards',
  extractionStrategy: 'verified-first-party-careers-page+career-block-cards+modal-details+same-page-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.impressico.com/career/ is the live first-party careers page for Impressico Business Solutions, that it renders Current Job Openings as inline career-block cards with modal details for roles such as Customer Success Manager and Artificial Intelligence Engineer, and that the same page contains the apply form and position selector.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'impressicobusinesssolutions/jobs.json',
}

export default IMPRESSICO_BUSINESS_SOLUTIONS_CATALOG
