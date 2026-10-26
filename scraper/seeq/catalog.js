import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SEEQ_CATALOG = {
  source: 'seeq',
  companyName: 'Seeq',
  officialBrandName: 'Seeq',
  adapter: 'script',
  homepageUrl: 'https://www.seeq.com/',
  companyCareerPage: 'https://www.seeq.com/careers/',
  workableBoardUrl: 'https://apply.workable.com/seeq/',
  jobsFeedUrl: 'https://apply.workable.com/seeq/jobs.md',
  companyDomain: 'seeq.com',
  atsPlatform: 'workable',
  countryFilter: 'India',
  paginationStrategy: 'unfiltered-native-cursor-exact-total',
  extractionStrategy:
    'current-employer-handoff+reciprocal-native-account+complete-india-details',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-26',
  verifiedSurfaceSummary:
    'On October 26, 2026, https://www.seeq.com/careers/ redirects to the canonical company/careers page and actively links https://apply.workable.com/seeq/. Runtime validates the reciprocal native account, complete unfiltered cursor inventory and full India details. Hidden native locations retain partial India scope; no current India-absence claim is made.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'seeq/jobs.json',
}

export default SEEQ_CATALOG
