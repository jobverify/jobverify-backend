import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.netomi.com/careers is the live first-party Netomi careers page and that its first-party source fetches public openings from https://api.lever.co/v0/postings/netomi?mode=json. Verified on Thursday, July 16, 2026 that the live Lever postings API returned 31 public jobs, including 19 India roles, with sample live postings such as Agentic Engineer at https://jobs.lever.co/netomi/ba379f47-091b-4f2d-82d3-e97a0821227e and Agentic AI Forward Deployment Engineering Lead at https://jobs.lever.co/netomi/8fa09624-2464-4e19-a56d-2c38323ce49d.'

export const NETOMI_CATALOG = {
  source: 'netomi',
  companyName: 'Netomi',
  officialBrandName: 'Netomi',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'netomi/jobs.json',
  homepageUrl: 'https://www.netomi.com/',
  companyCareerPage: 'https://www.netomi.com/careers',
  companyDomain: 'netomi.com',
  officialLeverBoardUrl: 'https://jobs.lever.co/netomi',
  leverApiUrl: 'https://api.lever.co/v0/postings/netomi?mode=json',
  verifiedPublicJobCount: 31,
  verifiedIndiaJobCount: 19,
  verifiedSampleJobUrl: 'https://jobs.lever.co/netomi/ba379f47-091b-4f2d-82d3-e97a0821227e',
  atsPlatform: 'lever',
  countryFilter: 'Global',
  paginationStrategy: 'official-careers-validation-plus-lever-api',
  extractionStrategy: 'verified-first-party-careers-page+embedded-lever-api+global-lever-postings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NETOMI_CATALOG
