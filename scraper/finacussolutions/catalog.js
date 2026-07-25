import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FINACUS_SOLUTIONS_CATALOG = {
  source: 'finacussolutions',
  companyName: 'Finacus Solutions',
  officialBrandName: 'Finacus Solutions Private Limited',
  adapter: 'script',
  homepageUrl: 'https://www.finacus.co.in/',
  companyCareerPage: 'https://www.finacus.co.in/careers/',
  companyDomain: 'finacus.co.in',
  atsPlatform: 'official-company-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-current-openings-section',
  extractionStrategy: 'verified-careers-page+inline-opening-cards+same-page-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 20,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that Finacus Solutions Private Limited published a first-party careers page at https://www.finacus.co.in/careers/ with a Current Openings section, a same-page Apply Now form, and 20 visible role cards including Sales Coordinator, React. JS Developer, Business Analyst, Front Desk Executive, and Solution Architect.',
  dryRunFile: 'finacussolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FINACUS_SOLUTIONS_CATALOG
