import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RNF_TECHNOLOGIES_CATALOG = {
  source: 'rnftechnologies',
  companyName: 'RNF Technologies',
  officialBrandName: 'RNF Technologies',
  adapter: 'script',
  homepageUrl: 'https://rnftechnologies.com/join-our-team',
  companyCareerPage: 'https://rnftechnologies.com/join-our-team/current-openings',
  officialCareersPageUrl: 'https://rnftechnologies.com/join-our-team/current-openings',
  companyDomain: 'rnftechnologies.com',
  atsPlatform: 'official-first-party-job-table-plus-detail-pages',
  countryFilter: 'India',
  paginationStrategy: 'single-current-openings-page',
  extractionStrategy: 'job-table+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on August 4, 2026 that https://rnftechnologies.com/join-our-team and https://rnftechnologies.com/join-our-team/current-openings were the live first-party RNF Technologies careers surfaces. The public Current Job Openings page still listed React Native Developer and React Developer in Noida, UP, India with first-party detail pages and apply routes under /join-our-team/current-openings/.',
  dryRunFile: 'rnftechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default RNF_TECHNOLOGIES_CATALOG
