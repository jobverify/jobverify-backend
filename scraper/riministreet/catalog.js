import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.riministreet.com/company/careers/ is the live first-party Rimini Street careers page, that its "See open positions" handoff points to the public Workday board at https://riministreet.wd1.myworkdayjobs.com/en-US/RiminiStreet, and that direct board verification currently resolves to the official Workday outage surface titled "Workday is currently unavailable." rather than a local 404 or unrelated target. This provider therefore keeps the trusted first-party Workday handoff and delegates enumeration to the shared Workday runner so temporary upstream outages remain soft-failable.'

export const RIMINI_STREET_CATALOG = {
  source: 'riministreet',
  companyName: 'Rimini Street',
  officialBrandName: 'Rimini Street',
  adapter: 'script',
  companyCareerPage: 'https://www.riministreet.com/company/careers/',
  officialCareersPageUrl: 'https://www.riministreet.com/company/careers/',
  officialWorkdayBoardUrl: 'https://riministreet.wd1.myworkdayjobs.com/en-US/RiminiStreet',
  companyDomain: 'riministreet.com',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-india-filter',
  extractionStrategy:
    'verified-first-party-careers-page+verified-workday-handoff+shared-workday-runner',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'riministreet/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default RIMINI_STREET_CATALOG
