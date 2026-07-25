import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AMANTYA_TECHNOLOGIES_CATALOG = {
  source: 'amantyatechnologies',
  companyName: 'Amantya Technologies',
  officialBrandName: 'Amantya Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.amantyatech.com/',
  companyCareerPage: 'https://www.amantyatech.com/careers',
  companyDomain: 'amantyatech.com',
  atsPlatform: 'official-first-party-job-panels',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-careers-page+inline-job-panels+onsite-application-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.amantyatech.com/careers is the live first-party Amantya Technologies careers page and that it exposes public inline role panels including Sr SW QA Automation Engineer, TAC Engineer, and Open Ran Developer, each with visible experience, location, and job-type metadata plus the first-party Apply Now handoff.',
  dryRunFile: 'amantyatechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default AMANTYA_TECHNOLOGIES_CATALOG
