import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ESDS_CATALOG = {
  source: 'esds',
  companyName: 'ESDS',
  officialBrandName: 'ESDS Software Solution Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  officialHomepageUrl: 'https://www.esds.co.in/',
  officialCareersLandingUrl: 'https://www.esds.co.in/careers/',
  companyCareerPage: 'https://www.esds.co.in/careers/',
  officialCareersHandoffUrl: 'https://esds.darwinbox.in/ms/candidatev2/main/careers/home',
  darwinboxOrigin: 'https://esds.darwinbox.in',
  darwinboxCompanyId: 'main',
  publicAllJobsUrl: 'https://esds.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  officialJobDetailExampleUrl: 'https://www.esds.co.in/career-details/a688746f77752a',
  darwinboxApplyHandoffUrlExample:
    'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-plus-darwinbox-browser-session-pagination',
  extractionStrategy:
    'verified-first-party-careers-page-html+darwinbox-browser-session-listing-api+job-id-intersection',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'esds.co.in',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://www.esds.co.in/ is the live ESDS homepage, that https://www.esds.co.in/careers/ still exposes the public first-party ESDS job cards, and that those first-party job IDs match the live ESDS Darwinbox public portal at https://esds.darwinbox.in/ms/candidatev2/main/careers/allJobs. First-party detail routes such as https://www.esds.co.in/career-details/a688746f77752a now boot into the Darwinbox candidate surface instead of the older HTML detail table, so this scraper verifies the ESDS careers page and then intersects the visible first-party job IDs with the live Darwinbox browser-session listing results. Verified visible roles included Data Center Project Manager and Compliance Specialist.',
  dryRunFile: 'esds/jobs.json',
}

export default ESDS_CATALOG
