import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG = {
  source: 'yalamanchilisoftwareexports',
  companyName: 'Yalamanchili Software Exports',
  officialBrandName: 'Yalamanchili',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.yalamanchili.co.in/',
  companyCareerPage: 'https://www.yalamanchili.co.in/',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'exact-name-domain-root-plus-common-careers-route-timeout-validation',
  extractionStrategy: 'verified-exact-name-first-party-domain-without-trustworthy-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'yalamanchili.co.in',
  dryRunFile: 'yalamanchilisoftwareexports/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the exact-name first-party host https://www.yalamanchili.co.in/ remained the best official domain candidate for Yalamanchili Software Exports, but this sweep did not confirm any trustworthy public careers feed or job board on that host or the common /careers and /jobs routes.',
}

export default YALAMANCHILI_SOFTWARE_EXPORTS_CATALOG
