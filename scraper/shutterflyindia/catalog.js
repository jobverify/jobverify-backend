import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SHUTTERFLY_INDIA_CATALOG = {
  source: 'shutterflyindia',
  companyName: 'Shutterfly India',
  officialBrandName: 'Shutterfly',
  adapter: 'script',
  homepageUrl: 'https://shutterflyinc.com/overview/',
  companyCareerPage: 'https://jobs.jobvite.com/shutterfly',
  officialJobsPageUrl: 'https://shutterflycareers.ttcportals.com/?p=jobs&nl=1',
  officialSearchResultsUrl: 'https://shutterflycareers.ttcportals.com/search/jobs',
  companyDomain: 'shutterflyinc.com',
  atsPlatform: 'jobvite-ttcportals-no-india-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'official-overview-plus-careers-home-plus-search-results-validation',
  extractionStrategy:
    'verified-overview-careers-link+verified-jobvite-redirected-ttc-home+verified-all-jobs-country-filter+no-india-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://shutterflyinc.com/overview/ is the official Shutterfly corporate overview page, that its careers CTA hands off to https://jobs.jobvite.com/shutterfly, and that the public Jobvite entry redirects to the Shutterfly TTC careers board. The verified careers home at https://shutterflycareers.ttcportals.com/?p=jobs&nl=1 lists Where We Work locations in the United States, Israel, and Canada only, while the public all-jobs page at https://shutterflycareers.ttcportals.com/search/jobs exposes country filters for Canada and United States only. No trustworthy public India jobs surface was exposed for the exact-name Shutterfly India target.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'shutterflyindia/jobs.json',
}

export default SHUTTERFLY_INDIA_CATALOG
