import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Monday, August 3, 2026 that https://netcorecloud.com/careers now resolves to https://netcore.ai/careers and serves a geotargeting redirect shell with "Join the community shaping the future of Agentic Marketing here." plus "Please wait while you are redirected to the right page..." instead of a trustworthy public jobs board. Verified on Monday, August 3, 2026 that https://netcorecloud.com/careers-list?job_category=engineering resolves to https://netcore.ai/careers-list?job_category=engineering and serves the same redirect/loading shell rather than public job listings. There is no trustworthy public jobs surface available from the verified first-party careers flow, so this provider fails closed and returns an empty array.'

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
  atsPlatform: 'official-company-careers-redirect-shell',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-careers-list-shell-validation',
  extractionStrategy:
    'verified-first-party-careers-page+verified-careers-list-redirect-shell-or-403-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NETCORE_CLOUD_CATALOG
