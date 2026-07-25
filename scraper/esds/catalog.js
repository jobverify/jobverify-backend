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
  officialJobDetailExampleUrl: 'https://www.esds.co.in/career-details/a688746f77752a',
  darwinboxApplyHandoffUrlExample:
    'https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1',
  atsPlatform: 'first-party-careers-page-plus-darwinbox-apply-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-html',
  extractionStrategy:
    'verified-first-party-careers-page-html+first-party-job-detail-html+darwinbox-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'esds.co.in',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.esds.co.in/ is the live ESDS homepage, that the public jobs listing surface is the first-party careers page at https://www.esds.co.in/careers/, and that first-party detail routes such as https://www.esds.co.in/career-details/a688746f77752a expose full job metadata and a Darwinbox apply handoff at https://esds.darwinbox.in/ms/candidate/candidate/login?redirect=%2Fms%2Fcandidate%2Fcareers%2Fa688746f77752a___apply%3D1. Verified visible roles including Head of Engineering and Python Engineer. The direct Darwinbox listing API at https://esds.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned 403 during verification, so this scraper uses the verified first-party HTML listing and detail pages.',
  dryRunFile: 'esds/jobs.json',
}

export default ESDS_CATALOG
