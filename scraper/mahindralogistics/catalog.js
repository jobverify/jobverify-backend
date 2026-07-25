import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAHINDRA_LOGISTICS_CATALOG = {
  source: 'mahindralogistics',
  companyName: 'Mahindra Logistics',
  officialBrandName: 'Mahindra Logistics',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'mahindralogistics/jobs.json',
  companyCareerPage: 'https://mahindralogistics.com/work-with-us/',
  officialCareersHandoffUrl: 'https://nectar.darwinbox.in/ms/candidate/careers',
  publicPortalUrl: 'https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  darwinboxListingApiUrl: 'https://nectar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  darwinboxOrigin: 'https://nectar.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'mahindralogistics.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'official-work-with-us-page-plus-darwinbox-listing-api',
  extractionStrategy: 'verified-official-work-with-us-page-handoff+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://mahindralogistics.com/work-with-us/ is the official Mahindra Logistics careers page and hands candidates to Darwinbox via https://nectar.darwinbox.in/ms/candidate/careers. The public Darwinbox jobs portal at https://nectar.darwinbox.in/ms/candidatev2/main/careers/allJobs showed 41 open jobs on the verified date, and the public listing endpoint https://nectar.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned public India openings including Mobility - Manager - Business Development, Deputy Manager - Branch Supply (Airport Operations), and Specialist - Site Operations.',
}

export default MAHINDRA_LOGISTICS_CATALOG
