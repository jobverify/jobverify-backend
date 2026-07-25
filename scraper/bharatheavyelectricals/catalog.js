import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.bhel.com/ is the live official Bharat Heavy Electricals Limited homepage, that its Career with BHEL footer links hand off to the public first-party careers portal at https://careers.bhel.in/index.jsp, and that the Current Openings page publicly exposes Regular Recruitment, Consultants/Experts/Deputation, and FTA/Part-Time opening blocks with live first-party opening routes such as https://careers1.bhel.in/lateral2020/jsp/et_eng_index.jsp and https://sbdapp.bhel.in/FTARecruitment/.'

export const BHARAT_HEAVY_ELECTRICALS_CATALOG = {
  source: 'bharatheavyelectricals',
  companyName: 'Bharat Heavy Electricals',
  officialBrandName: 'Bharat Heavy Electricals Limited',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'bharatheavyelectricals/jobs.json',
  homepageUrl: 'https://www.bhel.com/',
  homepageLinkedCareersUrl: 'https://careers.bhel.in/index.jsp',
  companyCareerPage: 'https://careers.bhel.in/index.jsp',
  companyDomain: 'bhel.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-handoff-plus-single-current-openings-page',
  extractionStrategy:
    'verified-homepage+verified-first-party-careers-portal+current-openings-blocks+trusted-application-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default BHARAT_HEAVY_ELECTRICALS_CATALOG
