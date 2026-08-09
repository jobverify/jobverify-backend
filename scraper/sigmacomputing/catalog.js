import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIGMA_COMPUTING_CATALOG = {
  source: 'sigmacomputing',
  companyName: 'Sigma Computing',
  officialBrandName: 'Sigma',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'sigmacomputing/jobs.json',
  companyCareerPage: 'https://www.sigmacomputing.com/company/careers',
  greenhouseBoardUrl: 'https://job-boards.greenhouse.io/sigmacomputing',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/sigmacomputing/jobs',
  companyDomain: 'sigmacomputing.com',
  verifiedPublicJobCount: 70,
  verifiedIndiaJobCount: 0,
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-public-greenhouse-board',
  extractionStrategy: 'verified-first-party-careers-page+public-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://www.sigmacomputing.com/company/careers was the live first-party Sigma Computing careers page with the Careers at Sigma heading, the View open positions call-to-action, and first-party role cards linking applicants to the official public Greenhouse board at https://job-boards.greenhouse.io/sigmacomputing. The public Greenhouse feed at https://boards-api.greenhouse.io/v1/boards/sigmacomputing/jobs?content=true exposed 70 live roles on the verified date, including Business Development Representative in New York City, NY, Senior Product Designer, AI in San Francisco, CA, and Commercial Account Executive (CAE) Manager - EMEA in London, UK, with zero India locations. No India roles were present in the verified public feed, so this provider currently returns an honest empty India slice while the trusted public surface remains unchanged.',
}

export default SIGMA_COMPUTING_CATALOG
