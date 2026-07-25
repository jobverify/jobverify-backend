import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that the exact-name first-party MSC careers URL https://www.msc.com/en/careers?jobs=Italy+Le+Navi surfaced official copy in search results saying "Unfortunately, we do not have any vacancies published in this country right now" and directing applicants to MSC LinkedIn job listings or local job sites instead of a first-party public board. Direct HTML fetches to the same first-party URL returned "Access Denied", so this provider fails closed and returns an empty array because there is no trustworthy first-party public jobs surface available for extraction.'

export const MSC_CATALOG = {
  source: 'msc',
  companyName: 'MSC',
  officialBrandName: 'MSC Mediterranean Shipping Company',
  adapter: 'script',
  homepageUrl: 'https://www.msc.com/en',
  companyCareerPage: 'https://www.msc.com/en/careers?jobs=Italy+Le+Navi',
  companyDomain: 'msc.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'Global',
  paginationStrategy: 'verified-careers-page-validation',
  extractionStrategy: 'verified-first-party-careers-copy-with-linkedin-handoff-or-access-denied-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'msc/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default MSC_CATALOG
