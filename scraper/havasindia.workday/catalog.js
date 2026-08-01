import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://in.havas.com/careers/ is the live first-party Havas India careers page, that its current job openings call-to-action points to the verified short handoff https://rb.gy/5daebl, and that the official public Workday board resolves at https://wd3.myworkdaysite.com/recruiting/havas/GroupExternalCareerSite. Verified the public jobs API at https://wd3.myworkdaysite.com/wday/cxs/havas/GroupExternalCareerSite/jobs from a browser-session request because a direct non-browser POST returned HTTP 500 during verification. The verified India country facet id c4f78be1a8f14da0ab49ce1162348a5e returned 53 India roles, including https://wd3.myworkdaysite.com/recruiting/havas/GroupExternalCareerSite/job/Chennai/Digital-Developer_JR0097642-1.'

export const HAVAS_INDIA_CATALOG = {
  source: 'havasindia',
  companyName: 'Havas India',
  officialBrandName: 'Havas',
  adapter: 'script',
  companyCareerPage: 'https://in.havas.com/careers/',
  officialHomepageUrl: 'https://in.havas.com/',
  companyDomain: 'havas.com',
  officialWorkdayBoardUrl: 'https://wd3.myworkdaysite.com/recruiting/havas/GroupExternalCareerSite',
  jobsApiUrl: 'https://wd3.myworkdaysite.com/wday/cxs/havas/GroupExternalCareerSite/jobs',
  verifiedIndiaCountryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
  verifiedIndiaJobUrl:
    'https://wd3.myworkdaysite.com/recruiting/havas/GroupExternalCareerSite/job/Chennai/Digital-Developer_JR0097642-1',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-browser-session-workday-country-facet',
  extractionStrategy:
    'verified-careers-page+verified-workday-board+browser-session-unfiltered-workday-jobs-api+india-country-facet+browser-session-filtered-workday-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'havasindia.workday/jobs.json',
}

export default HAVAS_INDIA_CATALOG
