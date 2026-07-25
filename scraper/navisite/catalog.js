import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NAVISITE_CATALOG = {
  source: 'navisite',
  companyName: 'NaviSite',
  officialBrandName: 'Navisite, Part of Accenture',
  adapter: 'script',
  homepageUrl: 'https://www.navisite.com/',
  companyCareerPage: 'https://www.navisite.com/about/careers/',
  parentCareersUrl: 'https://www.accenture.com/us-en/careers',
  atsPlatform: 'official-careers-parent-search-handoff',
  countryFilter: 'Global',
  paginationStrategy: 'first-party-handoff-page-validation',
  extractionStrategy:
    'verified-first-party-navisite-handoff+opaque-accenture-search-flow+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'navisite.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.navisite.com/about/careers/ was the live first-party Navisite careers page and that it instructed candidates to use the Accenture Careers page at https://www.accenture.com/us-en/careers and search “Navisite” for open roles. Because the public inventory is only exposed through that opaque parent search flow rather than a stable Navisite-enumerable board, this provider stays fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'navisite/jobs.json',
}

export default NAVISITE_CATALOG
