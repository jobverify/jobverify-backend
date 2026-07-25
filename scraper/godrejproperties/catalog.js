import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.godrejproperties.com/ and https://www.godrejproperties.com/know-us/about are live first-party Godrej Properties pages and both link "Work with Us" to the shared parent careers route at https://careers.godrejindustries.com/in/en/godrejproperties. Also verified that the shared parent route currently resolves to a branded "Work with Godrej Properties" shell that presents only generic recruiting copy and no trustworthy public job rows, job detail links, or exact-name enumerable openings contract. There is no trustworthy public jobs surface for the exact-name Godrej Properties row right now, so this provider fails closed and returns no jobs until an exact-name public openings surface becomes verifiable.'

export const GODREJ_PROPERTIES_CATALOG = {
  source: 'godrejproperties',
  companyName: 'Godrej Properties',
  officialBrandName: 'Godrej Properties',
  adapter: 'script',
  companyCareerPage: 'https://careers.godrejindustries.com/in/en/godrejproperties',
  homepageUrl: 'https://www.godrejproperties.com/',
  aboutUsUrl: 'https://www.godrejproperties.com/know-us/about',
  officialCareersHandoffUrl: 'https://careers.godrejindustries.com/in/en/godrejproperties',
  companyDomain: 'godrejproperties.com',
  atsPlatform: 'shared-parent-careers-non-enumerable-shell',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-work-with-us-handoff-plus-shared-parent-non-enumerable-shell',
  extractionStrategy:
    'verified-first-party-homepage+verified-first-party-about-page+verified-shared-parent-godrej-properties-shell+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'godrejproperties/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default GODREJ_PROPERTIES_CATALOG
