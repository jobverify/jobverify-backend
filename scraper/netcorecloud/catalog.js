import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://netcorecloud.com/careers is the live exact-name first-party Netcore Cloud careers landing page with "We\'ve Got Big Plans - and You Can Join Us on Our Journey!" marketing copy and category links into careers-list routes such as https://netcorecloud.com/careers-list?job_category=engineering. Verified on Thursday, July 16, 2026 that the first-party careers-list routes resolved to a redirect/loading shell that says "Please wait while you are redirected to the right page..." instead of a trustworthy public jobs board, and that direct HTML fetches to the Netcore Cloud careers and careers-list surfaces returned 403 responses during inspection. There is no trustworthy public jobs surface available from the verified first-party careers flow, so this provider fails closed and returns an empty array.'

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
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NETCORE_CLOUD_CATALOG
