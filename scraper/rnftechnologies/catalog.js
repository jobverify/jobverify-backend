import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RNF_TECHNOLOGIES_CATALOG = {
  source: 'rnftechnologies',
  companyName: 'RNF Technologies',
  officialBrandName: 'RNF Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.rnftechnologies.com/join-our-team',
  companyCareerPage: 'https://www.rnftechnologies.com/join-our-team/current-openings',
  officialCareersPageUrl: 'https://www.rnftechnologies.com/join-our-team/current-openings',
  companyDomain: 'rnftechnologies.com',
  atsPlatform: 'official-first-party-job-table-plus-detail-pages',
  countryFilter: 'India',
  paginationStrategy: 'single-current-openings-page',
  extractionStrategy: 'job-table+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.rnftechnologies.com/join-our-team/current-openings was the live first-party RNF Technologies Current Job Openings page and that it publicly listed React Native Developer and React Developer in Noida, UP, India, each with first-party detail pages under /join-our-team/current-openings/.',
  dryRunFile: 'rnftechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default RNF_TECHNOLOGIES_CATALOG
