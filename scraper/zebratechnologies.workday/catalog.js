import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.zebra.com/us/en/about-zebra/careers.html is the live first-party Zebra careers page and that its View Openings CTA hands off to the official public Workday board at https://zebra.wd501.myworkdayjobs.com/Zebra_careers. Official Zebra Workday job pages also exposed India openings including Application Engineer, L2 UX Researcher, and Software Engineer, Advanced (Android) in Bengaluru, India, so this local provider delegates to the shared Workday runner with India filtering.'

export const ZEBRA_TECHNOLOGIES_CATALOG = {
  source: 'zebratechnologies',
  companyName: 'Zebra Technologies',
  officialBrandName: 'Zebra',
  adapter: 'script',
  homepageUrl: 'https://www.zebra.com/',
  companyCareerPage: 'https://www.zebra.com/us/en/about-zebra/careers.html',
  officialCareersPageUrl: 'https://www.zebra.com/us/en/about-zebra/careers.html',
  officialWorkdayBoardUrl: 'https://zebra.wd501.myworkdayjobs.com/Zebra_careers',
  companyDomain: 'zebra.com',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-handoff-plus-workday-india-filter',
  extractionStrategy:
    'verified-first-party-careers-page+verified-workday-handoff+shared-workday-runner',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedIndiaCountryFacetId: 'c4f78be1a8f14da0ab49ce1162348a5e',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'zebratechnologies.workday/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ZEBRA_TECHNOLOGIES_CATALOG
