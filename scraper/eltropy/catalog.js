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
    'verified-first-party-careers-page-or-blocked-official-surface+greenhouse-board+greenhouse-jobs-api+greenhouse-board-detail-url+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eltropy.com',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://eltropy.com/ and https://eltropy.com/careers/ now return the same first-party-blocked "Just a moment..." surface, while the public Greenhouse board at https://job-boards.greenhouse.io/eltropyinc and the public Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/eltropyinc/jobs?content=true remain live. Verified that the Greenhouse jobs API exposes India roles including Data & Analytics Engineer and Engineering Manager, and that the public Greenhouse board continues to publish matching Eltropy Inc. job detail URLs.',
  dryRunFile: 'eltropy/jobs.json',
}

export default ELTROPY_CATALOG
