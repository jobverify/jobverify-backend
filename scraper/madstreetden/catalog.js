import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.madstreetden.com/careers/ is the live exact-name first-party careers page for Mad Street Den, that it still renders a Current Openings shell with a Darwinbox fallback link to https://msd.darwinbox.in/ms/candidate/careers/others?apply=1, that https://www.madstreetden.com/api/joblist.php currently returns the first-party 401 body {"status":0,"message":"Invalid Url"}, and that the linked public Darwinbox board at https://msd.darwinbox.in/ms/candidatev2/main/careers/allJobs currently renders "No jobs found". There is no trustworthy public jobs surface for Mad Street Den on the verified first-party hiring flow.'

export const MAD_STREET_DEN_CATALOG = {
  source: 'madstreetden',
  companyName: 'Mad Street Den',
  officialBrandName: 'Mad Street Den',
  adapter: 'script',
  homepageUrl: 'https://www.madstreetden.com/',
  companyCareerPage: 'https://www.madstreetden.com/careers/',
  jobListApiUrl: 'https://www.madstreetden.com/api/joblist.php',
  officialCareersHandoffUrl: 'https://msd.darwinbox.in/ms/candidate/careers/others?apply=1',
  darwinboxPublicBoardUrl: 'https://msd.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  companyDomain: 'madstreetden.com',
  atsPlatform: 'official-company-careers-empty-board',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-joblist-401-plus-darwinbox-empty-board-validation',
  extractionStrategy:
    'verified-first-party-careers-page+verified-joblist-invalid-url-response+verified-darwinbox-empty-board-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'madstreetden/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MAD_STREET_DEN_CATALOG
