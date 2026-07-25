import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SLACK_CATALOG = {
  source: 'slack',
  companyName: 'Slack',
  officialBrandName: 'Slack',
  adapter: 'script',
  companyCareerPage: 'https://slack.com/intl/en-in/careers',
  officialCareersPageUrl: 'https://slack.com/careers',
  companyDomain: 'slack.com',
  officialJobBoardDomain: 'salesforce.wd12.myworkdayjobs.com',
  atsPlatform: 'official-company-careers-page+public-workday-apply-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-current-empty-india-slice',
  extractionStrategy:
    'verified-first-party-careers-page+verified-location-filter+verified-public-workday-apply-links+return-empty-when-no-india-locations',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'slack/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://slack.com/careers redirects to the live first-party Slack careers page at https://slack.com/intl/en-in/careers, that the page publicly listed 10 open positions, and that its visible location filter plus public apply links under salesforce.wd12.myworkdayjobs.com exposed zero India locations on the exact-name Slack careers surface at verification time.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SLACK_CATALOG
