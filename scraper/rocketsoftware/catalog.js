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
  atsPlatform: 'official-careers-workday-handoff',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-page-plus-public-workday-jobs-api',
  extractionStrategy:
    'verified-careers-page+browser-fallback+public-workday-jobs-api+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://www.rocketsoftware.com/en-us/careers is Rocket Software\'s live first-party careers page and still links View current openings to https://rocket.wd5.myworkdayjobs.com/rocket_careers. Direct non-browser fetches of the careers page now hit a Cloudflare challenge, but the public Workday jobs API at https://rocket.wd5.myworkdayjobs.com/wday/cxs/rocket/rocket_careers/jobs is live again and returned 5 India postings, including Software Engineer III - Java Full Stack Development in Bengaluru and Senior Software Engineer (C++, Parser /Compiler Development) in Pune.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'rocketsoftware/jobs.json',
}

export default ROCKET_SOFTWARE_CATALOG
