import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.mastek.com/careers/ is the live official Mastek careers page, that its Explore Jobs call-to-action links to the first-party jobs board at https://careers.mastek.com/search/, that the public search surface there shows "Showing 1 to 12 of 31 Jobs", and that a live India detail page was verified at https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/ for Oracle HCM Functional Consultant (Payroll) in Pune, IN. The published board also exposes mixed global locations, so this scraper conservatively keeps only India-coded rows from the verified first-party surface.'

export const MASTEK_CATALOG = {
  source: 'mastek',
  companyName: 'Mastek',
  officialBrandName: 'Mastek Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'mastek/jobs.json',
  officialBrandSiteUrl: 'https://www.mastek.com/',
  companyCareerPage: 'https://www.mastek.com/careers/',
  officialCareersHandoffUrl: 'https://careers.mastek.com/search/',
  verifiedSampleJobUrl:
    'https://careers.mastek.com/job/Pune-Oracle-HCM-Functional-Consultant-%28Payroll%29/47800844/',
  companyDomain: 'careers.mastek.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  verifiedPublicJobCount: 31,
  paginationStrategy: 'first-party-search-startrow-query',
  extractionStrategy:
    'official-careers-page+first-party-search-page+job-tiles+detail-pages+talentcommunity-apply-handoff+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default MASTEK_CATALOG
