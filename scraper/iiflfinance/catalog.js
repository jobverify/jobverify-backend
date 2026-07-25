import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IIFL_FINANCE_CATALOG = {
  source: 'iiflfinance',
  companyName: 'IIFL Finance',
  officialBrandName: 'IIFL Finance',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.iifl.com/finance/career',
  officialCareersHandoffUrl: 'https://iifl.darwinbox.in/ms/candidate/careers',
  officialResumeSubmissionUrl: 'https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1',
  publicPortalUrl: 'https://iifl.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  darwinboxListingApiUrl: 'https://iifl.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  darwinboxOrigin: 'https://iifl.darwinbox.in',
  darwinboxCompanyId: 'main',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-first-party-careers-page-handoff+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'iifl.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.iifl.com/finance/career is the official IIFL Finance careers page and explicitly hands candidates to Darwinbox via Find Jobs at https://iifl.darwinbox.in/ms/candidate/careers and Upload Resume at https://iifl.darwinbox.in/ms/candidate/careers/others?apply=1. The public candidate shell resolves at https://iifl.darwinbox.in/ms/candidatev2/main/careers/allJobs while the direct listing API is Cloudflare-protected, so the provider uses the shared browser-session Darwinbox flow.',
  dryRunFile: 'iiflfinance/jobs.json',
}

export default IIFL_FINANCE_CATALOG
