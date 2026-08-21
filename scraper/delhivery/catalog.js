import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, August 14, 2026 that https://www.delhivery.com/ is the live first-party homepage and that https://www.delhivery.com/careers is the live first-party careers page, now serving a Nuxt app shell with the exact title "Build Your Career with Delhivery â€“ Join India\'s Leading Logistics Innovator", the raw shell marker careersV2.webp, and the __nuxt loading container before richer content hydrates. Browser-rendered verification on the same date confirmed that this careers experience still exposes the public "Jobs at Delhivery" handoff to https://delhivery.darwinbox.in/ms/candidate/careers. Verified that https://delhivery.darwinbox.in/jobs resolves into the public Darwinbox candidate portal at https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home, that the public all-jobs route remains https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs, and that the seeded public listing API at https://delhivery.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned 6 India jobs. Direct bare non-browser POST requests to that listing API were still Cloudflare 403 blocked during verification, so this scraper now uses seeded Darwinbox public-cookie pagination instead of an unseeded direct API call.'

export const DELHIVERY_CATALOG = {
  source: 'delhivery',
  companyName: 'Delhivery',
  officialBrandName: 'Delhivery Limited',
  adapter: 'script',
  companyCareerPage: 'https://www.delhivery.com/careers',
  homepageUrl: 'https://www.delhivery.com/',
  officialCareersHandoffUrl: 'https://delhivery.darwinbox.in/ms/candidate/careers',
  darwinboxJobsUrl: 'https://delhivery.darwinbox.in/jobs',
  publicPortalHomeUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home',
  publicAllJobsUrl: 'https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  listingApiUrl: 'https://delhivery.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  darwinboxOrigin: 'https://delhivery.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'delhivery.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'seeded-darwinbox-public-cookie-pagination',
  extractionStrategy: 'verified-first-party-careers-app-shell+seeded-darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-14',
  verifiedPublicJobCount: 6,
  verifiedIndiaJobCount: 6,
  dryRunFile: path.join(currentDir, 'jobs.json'),
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
}

export default DELHIVERY_CATALOG
