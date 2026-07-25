import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://agrevolution.in/ exposes the first-party DeHaat homepage with an Apply Now handoff to https://apply.workable.com/agrevolution/, that https://agrevolution.in/careers remains the live first-party careers page, and that the public Workable surfaces at https://apply.workable.com/agrevolution/, https://apply.workable.com/agrevolution/jobs.md, and https://apply.workable.com/api/v1/widget/accounts/agrevolution were live with 0 current openings on the verified date.'

export const DEHAAT_CATALOG = {
  source: 'dehaat',
  companyName: 'DeHaat',
  officialBrandName: 'DeHaat',
  adapter: 'script',
  homepageUrl: 'https://agrevolution.in/',
  companyCareerPage: 'https://agrevolution.in/careers',
  careersPageUrl: 'https://agrevolution.in/careers',
  workableBoardUrl: 'https://apply.workable.com/agrevolution/',
  jobsFeedUrl: 'https://apply.workable.com/agrevolution/jobs.md',
  widgetApiUrl: 'https://apply.workable.com/api/v1/widget/accounts/agrevolution',
  companyDomain: 'agrevolution.in',
  atsPlatform: 'first-party-handoff-workable',
  countryFilter: 'India',
  paginationStrategy: 'first-party-homepage-handoff-plus-workable-markdown-feed',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-careers-page+verified-workable-board+verified-workable-jobs-feed+widget-api-empty-state',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'dehaat/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DEHAAT_CATALOG
