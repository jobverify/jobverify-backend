import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FORTY_TWO_GEARS_CATALOG = {
  source: '42gears',
  companyName: '42Gears Mobility Systems',
  officialBrandName: '42Gears Mobility Systems',
  adapter: 'script',
  homepageUrl: 'https://www.42gears.com/',
  companyCareerPage: 'https://www.42gears.com/careers/?selected_jobtype=-1&selected_location=india',
  companyDomain: '42gears.com',
  atsPlatform: 'official-first-party-job-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-page-filtered-india-listing',
  extractionStrategy: 'job-card-listing',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.42gears.com/careers/?selected_jobtype=-1&selected_location=india was the live first-party India-filtered 42Gears Mobility Systems careers page and that it publicly exposed a Current Openings listing including Intern – Admin and facilities and Lead Software Engineer on the verified date.',
  dryRunFile: '42gears/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default FORTY_TWO_GEARS_CATALOG
