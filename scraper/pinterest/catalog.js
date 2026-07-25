import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PINTEREST_CATALOG = {
  source: 'pinterest',
  companyName: 'Pinterest',
  officialBrandName: 'Pinterest',
  adapter: 'script',
  companyCareerPage: 'https://www.pinterestcareers.com/jobs/',
  officialCareersPageUrl: 'https://www.pinterestcareers.com/jobs/',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/pinterest/jobs?content=true',
  officialJobUrlPrefix: 'https://www.pinterestcareers.com/jobs/?gh_jid=',
  companyDomain: 'pinterestcareers.com',
  atsPlatform: 'greenhouse',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy:
    'verified-first-party-careers-domain+public-greenhouse-jobs-api+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official Pinterest jobs surface is the first-party domain https://www.pinterestcareers.com/jobs/, and that the public Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/pinterest/jobs?content=true returns first-party apply URLs on that domain. The verified live payload returned 195 postings on that date, including Chief of Staff, Marketing and Agency Lead, but zero India roles, so this exact-name provider is pinned to the official surface and currently returns an honest empty India slice.',
  dryRunFile: 'pinterest/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PINTEREST_CATALOG
