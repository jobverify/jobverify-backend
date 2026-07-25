import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PRACTO_CATALOG = {
  source: 'practo',
  companyName: 'Practo',
  officialBrandName: 'Practo',
  adapter: 'script',
  homepageUrl: 'https://www.practo.com/',
  companyCareerPage: 'https://careers.practo.com/practo/',
  companyDomain: 'practo.com',
  atsPlatform: 'zwayam-hidden-closed-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-shell-plus-zwayam-search-contract-validation',
  extractionStrategy: 'verified-careers-shell+verified-zwayam-search-hidden-closed-only-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialSearchApiUrl: 'https://public.zwayam.com/jobs/search',
  zwayamCompanyId: 'MTYzMDI=',
  zwayamDetailCompanyId: '16302',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://careers.practo.com/practo/ is the live official Practo careers shell titled "Practo | Careers", while the official Zwayam search payload for Practo returned only records flagged Hidden and Closed with appliesNotBlocked 0. Because the verified official surface exposed no trustworthy public jobs surface, this provider is a fail-closed sentinel that returns no jobs.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default PRACTO_CATALOG
