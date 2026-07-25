import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SETU_CATALOG = {
  source: 'setu',
  companyName: 'Setu',
  officialBrandName: 'BrokenTusk Technologies Pvt. Ltd.',
  adapter: 'script',
  companyCareerPage: 'https://setu.co/careers/',
  officialCareersPageUrl: 'https://setu.co/careers/',
  companyDomain: 'setu.co',
  atsPlatform: 'first-party-dynamic-html-board',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page-with-browser-rendered-openings',
  extractionStrategy:
    'verified-first-party-careers-page+browser-rendered-openings+same-page-apply-anchors',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official Setu public hiring surface for this exact-name provider was the first-party careers page at https://setu.co/careers/. The verified careers shell exposed the Current openings section with a Fetching open roles placeholder, while the same first-party surface rendered public roles including SDE - II Fullstack Engineer and SDE - II Backend Engineer once openings were populated client-side.',
  dryRunFile: 'setu/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SETU_CATALOG
