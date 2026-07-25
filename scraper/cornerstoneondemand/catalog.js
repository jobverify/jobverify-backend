import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CORNERSTONE_ONDEMAND_CATALOG = {
  source: 'cornerstoneondemand',
  companyName: 'Cornerstone OnDemand',
  officialBrandName: 'Cornerstone',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'cornerstoneondemand/jobs.json',
  companyCareerPage: 'https://www.cornerstoneondemand.com/careers/',
  officialJobsBoardUrl: 'https://cornerstone.csod.com/ux/ats/careersite/2/home?c=cornerstone',
  companyDomain: 'cornerstoneondemand.com',
  atsPlatform: 'cornerstone-csod',
  countryFilter: 'India',
  paginationStrategy: 'public-csod-search-api-with-postings-window',
  extractionStrategy:
    'verified-first-party-careers-page+public-csod-search-api+india-location-filter+extended-postings-window',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 82,
  verifiedIndiaJobCount: 8,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.cornerstoneondemand.com/careers/ is the live first-party Cornerstone careers page and that its Search Open Positions CTA leads to the public CSOD board at https://cornerstone.csod.com/ux/ats/careersite/2/home?c=cornerstone. The embedded CSOD context exposed the public search API host https://us-galaxy.api.csod.com/, and the public requisition search returned zero jobs with the default window but 82 total jobs once postingsWithinDays=3650 was supplied, including India roles in Pune and Hyderabad.',
}

export default CORNERSTONE_ONDEMAND_CATALOG
