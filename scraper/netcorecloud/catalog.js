import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on September 13, 2026 that https://netcorecloud.com/careers redirects to https://netcore.ai/careers and embeds the official careers presentation. The linked https://netcorecloud.com/careers-list?job_category=engineering redirects to https://netcore.ai/careers-list?job_category=engineering and embeds netcoreai.mynexthire.com. The public MyNextHire reqlist/get inventory supplies all departments; typed records are validated before India filtering. Loading shells, blocked responses, malformed records, and unknown locations reject the snapshot.'

export const NETCORE_CLOUD_CATALOG = {
  source: 'netcorecloud',
  companyName: 'Netcore Cloud',
  officialBrandName: 'Netcore Cloud',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'netcorecloud/jobs.json',
  homepageUrl: 'https://netcorecloud.com/',
  companyCareerPage: 'https://netcorecloud.com/careers',
  companyCareersListUrl: 'https://netcorecloud.com/careers-list?job_category=engineering',
  companyDomain: 'netcorecloud.com',
  atsPlatform: 'mynexthire',
  countryFilter: 'India',
  paginationStrategy: 'complete-public-reqlist-inventory',
  extractionStrategy:
    'first-party-careers-list-handoff+validated-mynexthire-inventory+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NETCORE_CLOUD_CATALOG
