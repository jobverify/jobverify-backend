import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ELTROPY_CATALOG = {
  source: 'eltropy',
  companyName: 'Eltropy',
  officialBrandName: 'Eltropy',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  officialHomepageUrl: 'https://eltropy.com/',
  officialCareersLandingUrl: 'https://eltropy.com/careers/',
  companyCareerPage: 'https://job-boards.greenhouse.io/eltropyinc',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/eltropyinc',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/eltropyinc/jobs',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy:
    'verified-first-party-careers-page+greenhouse-jobs-api+greenhouse-board-detail-url+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eltropy.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://eltropy.com/careers/ is the live first-party Eltropy careers page and that it links to the public Greenhouse board at https://job-boards.greenhouse.io/eltropyinc. Verified that the public Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/eltropyinc/jobs?content=true exposes India roles including AI Optimization Specialist (India), Sr. Cyber Security Analyst, and Vice President of Engineering.',
  dryRunFile: 'eltropy/jobs.json',
}

export default ELTROPY_CATALOG
