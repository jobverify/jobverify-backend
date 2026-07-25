import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PICKRR_CATALOG = {
  source: 'pickrr',
  companyName: 'Pickrr',
  officialBrandName: 'Pickrr',
  adapter: 'script',
  homepageUrl: 'https://pickrr.com/',
  companyCareerPage: 'https://pickrr.com/life-at-pickrr/',
  companyDomain: 'pickrr.com',
  officialSitemapUrl: 'https://pickrr.com/sitemap.xml',
  official404CareersUrl: 'https://pickrr.com/careers',
  atsPlatform: 'official-company-careers-form-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-sitemap-plus-life-page-validation',
  extractionStrategy:
    'verified-homepage+verified-life-at-pickrr-page+verified-sitemap+verified-careers-404-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://pickrr.com/ is the live official Pickrr homepage, that https://pickrr.com/life-at-pickrr/ is the official first-party "Life at Pickrr" careers-branded page with a resume submission form but no trustworthy public job listings, that https://pickrr.com/sitemap.xml exposes the life-at-pickrr route but not a public careers route, and that https://pickrr.com/careers resolves to the first-party "Page Not Found - Pickrr" page.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'pickrr/jobs.json',
}

export default PICKRR_CATALOG
