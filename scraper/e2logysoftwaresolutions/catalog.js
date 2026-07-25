import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const E2LOGY_SOFTWARE_SOLUTIONS_CATALOG = {
  source: 'e2logysoftwaresolutions',
  companyName: 'E2logy Software Solutions',
  officialBrandName: 'E2logy Software Solutions',
  adapter: 'script',
  homepageUrl: 'https://e2logy.com/',
  companyCareerPage: 'https://e2logy.com/careers/',
  companyDomain: 'e2logy.com',
  atsPlatform: 'official-careers-page-embedded-zoho-recruit',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-plus-zoho-public-openings-api',
  extractionStrategy: 'verified-first-party-careers-page+verified-embedded-zoho-public-openings-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://e2logy.com/careers/ was the live first-party E2logy careers page and that it embedded the public Zoho Recruit widget for https://e2logy.zohorecruit.com, whose verified public Job_Openings API returned live India openings on the verified date.',
  dryRunFile: 'e2logysoftwaresolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default E2LOGY_SOFTWARE_SOLUTIONS_CATALOG
