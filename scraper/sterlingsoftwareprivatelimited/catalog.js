import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const STERLING_SOFTWARE_PRIVATE_LIMITED_CATALOG = {
  source: 'sterlingsoftwareprivatelimited',
  companyName: 'Sterling Software Private Limited',
  officialBrandName: 'Sterling',
  adapter: 'script',
  homepageUrl: 'https://sterlingsoftware.global/',
  companyCareerPage: 'https://sterlingsoftware.global/career/',
  atsPlatform: 'official-company-site-no-live-openings',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-without-live-public-openings',
  extractionStrategy:
    'verified-first-party-careers-page+commented-historical-openings+returns-empty-array',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'sterlingsoftware.global',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://sterlingsoftware.global/career/ was the live first-party Sterling careers page, that it still exposed the Current Opening heading, and that the only role-shaped evidence on the page was commented historical Chennai rows, leaving no live public openings.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sterlingsoftwareprivatelimited/jobs.json',
}

export default STERLING_SOFTWARE_PRIVATE_LIMITED_CATALOG
