import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECHNOSOFT_CORPORATION_CATALOG = {
  source: 'technosoftcorporation',
  companyName: 'Technosoft Corporation',
  officialBrandName: 'Technosoft Corporation',
  adapter: 'script',
  homepageUrl: 'http://www.technosoftcorp.com/',
  companyCareerPage: 'http://www.technosoftcorp.com/',
  legacyRedirectUrl: 'https://www.apexon.com/',
  companyDomain: 'technosoftcorp.com',
  atsPlatform: 'legacy-domain-redirect-no-public-jobs',
  countryFilter: 'United States',
  paginationStrategy: 'legacy-homepage-redirect-plus-common-careers-404-check',
  extractionStrategy:
    'verified-legacy-homepage-redirect+verified-empty-first-party-careers-routes+no-exact-name-public-jobs',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that http://www.technosoftcorp.com/ rendered the exact-name first-party legacy page stating "Technosoft is now Apexon" with a click-through to https://www.apexon.com/, while exact-name first-party routes such as http://www.technosoftcorp.com/careers, /careers/, /jobs, and /join-us returned 404 responses. There is no trustworthy exact-name public jobs surface for Technosoft Corporation on the verified date.',
  dryRunFile: 'technosoftcorporation/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TECHNOSOFT_CORPORATION_CATALOG
