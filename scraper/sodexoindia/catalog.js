import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SODEXO_INDIA_CATALOG = {
  source: 'sodexoindia',
  companyName: 'Sodexo India',
  officialBrandName: 'Sodexo India',
  adapter: 'script',
  companyCareerPage: 'https://www.sodexo.in/careers',
  officialHomepageUrl: 'https://www.sodexo.in/',
  accessHrJobsUrl: 'https://accesshr.in.sodexo.com/#/jobs',
  companyDomain: 'sodexo.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-accesshr-login-or-timeout-validation',
  extractionStrategy:
    'verified-first-party-careers-page+verified-accesshr-jobs-link+verified-login-shell-or-timeout-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on July 17, 2026 that https://www.sodexo.in/careers is the live Sodexo India careers page and its raw first-party HTML links candidates to https://accesshr.in.sodexo.com/#/jobs. The linked AccessHr surface on https://accesshr.in.sodexo.com/ remained only a login shell in search-indexed first-party snippets and timed out during direct HTTP probes, so there is no trustworthy public jobs surface that can be extracted automatically at the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SODEXO_INDIA_CATALOG
