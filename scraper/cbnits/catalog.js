import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CBNITS_CATALOG = {
  source: 'cbnits',
  companyName: 'CBNITS',
  officialBrandName: 'CBNITS',
  adapter: 'script',
  homepageUrl: 'https://www.cbnits.com/',
  companyCareerPage: 'https://www.cbnits.com/career',
  atsPlatform: 'first-party-spa-careers-shell-no-public-jobs-html',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-spa-shell-validation',
  extractionStrategy: 'verified-first-party-careers-spa-shell-without-ssr-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cbnits.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.cbnits.com/career remained the exact-name first-party CBNITS careers route, that search-engine rendering still described "Current career opportunities at CBNITS", and that the raw first-party HTML response fetched on the verified date was only a client-rendered SPA shell with a title for CBNITS, a module bundle, and <div id="root"></div> rather than any trustworthy server-rendered public jobs payload.',
  dryRunFile: 'cbnits/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CBNITS_CATALOG
