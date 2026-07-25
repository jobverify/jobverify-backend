import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TOMTOM_CATALOG = {
  source: 'tomtom',
  companyName: 'TomTom',
  officialBrandName: 'TomTom',
  adapter: 'script',
  companyCareerPage: 'https://www.tomtom.com/careers/',
  officialCareersPageUrl: 'https://www.tomtom.com/careers/',
  officialPuneOfficeUrl: 'https://www.tomtom.com/careers/offices/pune/',
  verifiedJobDetailUrl:
    'https://www.tomtom.com/careers/jobdetails/69e7559e-d422-41fe-bd4c-1ae77ffafcc9/software-engineering-manager-i-navigation/',
  verifiedApplyUrl:
    'https://jobs.eu.lever.co/tomtom/69e7559e-d422-41fe-bd4c-1ae77ffafcc9/apply',
  officialLeverBoardUrl: 'https://jobs.eu.lever.co/tomtom',
  leverApiUrl: 'https://api.eu.lever.co/v0/postings/tomtom?mode=json',
  companyDomain: 'tomtom.com',
  atsPlatform: 'lever',
  countryFilter: 'India',
  paginationStrategy:
    'verified-first-party-careers-office-and-detail-surfaces-plus-eu-lever-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-pune-office-page+verified-job-detail-apply-handoff+verified-eu-lever-board+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.tomtom.com/careers/ is the live first-party TomTom careers landing page, that https://www.tomtom.com/careers/offices/pune/ is the live TomTom Pune office page for TomTom India Pvt Ltd, and that the first-party job-detail page at https://www.tomtom.com/careers/jobdetails/69e7559e-d422-41fe-bd4c-1ae77ffafcc9/software-engineering-manager-i-navigation/ hands applicants to the official TomTom EU Lever surface at https://jobs.eu.lever.co/tomtom/69e7559e-d422-41fe-bd4c-1ae77ffafcc9/apply. The corresponding public TomTom board at https://jobs.eu.lever.co/tomtom currently exposes Pune, India in the location filters and a live India role titled Engineer III (SAP SD).',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default TOMTOM_CATALOG
