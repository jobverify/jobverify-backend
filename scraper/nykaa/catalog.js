import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://careers.nykaa.com/ is the live official Nykaa public careers board, that it paginates through 22 public jobs across 3 pages on the official careers subdomain, and that verified detail pages such as https://careers.nykaa.com/54a30b39-e12b-4df4-9496-e4e56729eb8d expose posting dates, locations, experience, and job descriptions.'

export const NYKAA_CATALOG = {
  source: 'nykaa',
  companyName: 'Nykaa',
  adapter: 'script',
  companyCareerPage: 'https://careers.nykaa.com/',
  publicBoardUrl: 'https://careers.nykaa.com/',
  sampleJobUrl: 'https://careers.nykaa.com/54a30b39-e12b-4df4-9496-e4e56729eb8d',
  companyDomain: 'nykaa.com',
  atsPlatform: 'skima-hosted-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-official-careers-subdomain-plus-html-pagination',
  extractionStrategy:
    'verified-official-careers-board+html-job-cards+detail-pages+skima-structured-metadata',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedPublicOpeningCount: 22,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'nykaa/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default NYKAA_CATALOG
