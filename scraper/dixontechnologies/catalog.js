import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dixoninfo.com/ is the live first-party Dixon Technologies homepage and that its "WORK WITH US" call-to-action links directly to the first-party public careers page at https://www.dixoninfo.com/job-openings. Verified that the job-openings page exposes the public Darwinbox handoff via an "EXPLORE JOB OPENINGS" link to https://dixon.darwinbox.in/ms/candidate/careers. Verified that https://dixon.darwinbox.in/jobs resolves to the public Darwinbox portal at https://dixon.darwinbox.in/ms/candidatev2/main/careers/home and that the public jobs shell is hosted at https://dixon.darwinbox.in/ms/candidatev2/main/careers/allJobs. Direct non-browser requests to the Darwinbox candidate API were Cloudflare-protected during verification, so this scraper uses the repo\'s existing browser-session Darwinbox pagination pattern.'

export const DIXON_TECHNOLOGIES_CATALOG = {
  source: 'dixontechnologies',
  companyName: 'Dixon Technologies',
  officialBrandName: 'Dixon Technologies',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'dixontechnologies/jobs.json',
  homepageUrl: 'https://www.dixoninfo.com/',
  companyCareerPage: 'https://www.dixoninfo.com/job-openings',
  officialCareersHandoffUrl: 'https://dixon.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://dixon.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'dixoninfo.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-homepage+official-job-openings-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default DIXON_TECHNOLOGIES_CATALOG
