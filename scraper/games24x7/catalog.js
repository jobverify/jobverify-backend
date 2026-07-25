import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://games24x7.com/ redirects to the live first-party homepage at https://www.games24x7.com/, that the official life and careers page is https://www.games24x7.com/life, and that the page explicitly hands job seekers to the public Darwinbox route https://games24x7.darwinbox.in/ms/candidate/a6150564417204/careers for PLAY GAMES24X7 PVT LTD-INDIA. The Darwinbox all-jobs shell at https://games24x7.darwinbox.in/ms/candidatev2/a6150564417204/careers/allJobs and listing API contract at https://games24x7.darwinbox.in/ms/candidateapi/job/alljobs?companyId=a6150564417204 were identified from that handoff, but direct non-browser requests to those Darwinbox URLs timed out from the verified environment, so this scraper uses the browser-session Darwinbox pagination pattern already established in the repo.'

export const GAMES24X7_CATALOG = {
  source: 'games24x7',
  companyName: 'Games24x7',
  officialBrandName: 'Games24x7',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.games24x7.com/',
  redirectedHomepageUrl: 'https://www.games24x7.com/',
  companyCareerPage: 'https://www.games24x7.com/life',
  careerPageUrl: 'https://www.games24x7.com/life',
  officialCareersHandoffUrl: 'https://games24x7.darwinbox.in/ms/candidate/a6150564417204/careers',
  darwinboxOrigin: 'https://games24x7.darwinbox.in',
  darwinboxCompanyId: 'a6150564417204',
  companyDomain: 'games24x7.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-life-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'games24x7/jobs.json',
}

export default GAMES24X7_CATALOG
