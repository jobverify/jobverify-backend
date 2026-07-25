import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ROCKET_SOFTWARE_CATALOG = {
  source: 'rocketsoftware',
  companyName: 'Rocket Software',
  officialBrandName: 'Rocket Software',
  adapter: 'script',
  homepageUrl: 'https://www.rocketsoftware.com/',
  companyCareerPage: 'https://www.rocketsoftware.com/en-us/careers',
  workdayBoardUrl: 'https://rocket.wd5.myworkdayjobs.com/rocket_careers',
  jobsApiUrl: 'https://rocket.wd5.myworkdayjobs.com/wday/cxs/rocket/rocket_careers/jobs',
  companyDomain: 'rocketsoftware.com',
  atsPlatform: 'official-careers-workday-handoff-with-upstream-outage',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-page-plus-workday-outage-validation',
  extractionStrategy:
    'verified-careers-page+verified-workday-handoff+verified-workday-outage-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.rocketsoftware.com/en-us/careers is Rocket Software\'s live first-party careers page and that its Current Openings handoff targets https://rocket.wd5.myworkdayjobs.com/rocket_careers. During verification, both the public Workday board and the public jobs API were serving the Workday upstream outage page titled "Workday is currently unavailable.", so this provider remains fail-closed until Rocket\'s public board recovers.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'rocketsoftware/jobs.json',
}

export default ROCKET_SOFTWARE_CATALOG
