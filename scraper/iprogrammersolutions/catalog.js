import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IPROGRAMMER_SOLUTIONS_CATALOG = {
  source: 'iprogrammersolutions',
  companyName: 'Iprogrammer Solutions',
  officialBrandName: 'iProgrammer Solutions',
  adapter: 'script',
  homepageUrl: 'https://iprogrammer.com/',
  companyCareerPage: 'https://iprogrammer.com/current-openings-pune/',
  companyDomain: 'iprogrammer.com',
  atsPlatform: 'official-first-party-job-listing-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy: 'job-card-listing-with-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: "2026-09-13",
  verifiedSurfaceSummary:
    "Verified September 13, 2026: the official iProgrammer current-openings page publishes nine role cards. The parser accounts for every unique first-party detail URL and validates role fields and locations without depending on closed vacancy titles.",
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'iprogrammersolutions/jobs.json',
}

export default IPROGRAMMER_SOLUTIONS_CATALOG
