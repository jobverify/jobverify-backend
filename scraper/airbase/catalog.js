import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AIRBASE_CATALOG = {
  source: 'airbase',
  companyName: 'Airbase',
  officialBrandName: 'Airbase by Paylocity',
  legalEntityName: 'Airbase Inc.',
  adapter: 'script',
  companyCareerPage: 'https://www.airbase.com/careers',
  parentCareersPage: 'https://www.paylocity.com/company/careers/',
  companyDomain: 'airbase.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-acquisition-homepage-plus-generic-parent-careers-redirect-plus-missing-routes',
  extractionStrategy:
    'verified-acquisition-homepage+verified-generic-paylocity-careers-redirect-without-airbase-jobs+verified-missing-career-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.airbase.com/ is the live Airbase acquisition homepage, https://www.airbase.com/careers redirects to the generic parent careers page at https://www.paylocity.com/company/careers/, https://careers.airbase.com/ did not resolve publicly, and https://www.airbase.com/jobs, https://www.airbase.com/career, https://www.airbase.com/join-us, https://www.airbase.com/work-with-us, https://www.airbase.com/openings, and https://www.airbase.com/current-openings all returned 404. There is no trustworthy public jobs surface for Airbase: the verified careers route is only a generic Paylocity careers redirect and the parent careers page did not expose an Airbase-specific public job board during live checks.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AIRBASE_CATALOG
