import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PEPPERFRY_CATALOG = {
  source: 'pepperfry',
  companyName: 'Pepperfry',
  officialBrandName: 'Pepperfry',
  adapter: 'script',
  homepageUrl: 'https://www.pepperfry.com/',
  companyCareerPage: 'https://www.pepperfry.com/pages/careers.html?type=footer',
  companyDomain: 'pepperfry.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'browser-validated-homepage-footer-careers-link-plus-first-party-404-careers-page',
  extractionStrategy: 'verified-homepage-footer-careers-link+verified-first-party-404-careers-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.pepperfry.com/ is the live official Pepperfry homepage and that its footer careers entry points to https://www.pepperfry.com/pages/careers.html?type=footer. That exact first-party careers URL currently renders a first-party missing-page surface with the visible messages "404-Soul Not Found" and "Page Also Not Found" instead of public openings. No trustworthy public jobs surface was verifiable on the exact-name Pepperfry domain, so this provider is pinned as a fail-closed sentinel that returns no jobs until a real first-party careers board appears.',
  dryRunFile: 'pepperfry/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PEPPERFRY_CATALOG
