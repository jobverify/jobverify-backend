import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.delhivery.com/ is the live first-party homepage, that https://www.delhivery.com/careers is the live first-party careers page, and that this page exposes both "Jobs at Delhivery" and "Corporate Jobs" links to the public Darwinbox handoff at https://delhivery.darwinbox.in/ms/candidate/careers. Verified that https://delhivery.darwinbox.in/jobs resolves to the public candidate portal at https://delhivery.darwinbox.in/ms/candidatev2/main/careers/home, that this home surface shows 10 open jobs and links to https://delhivery.darwinbox.in/ms/candidatev2/main/careers/allJobs, and that the browser-session Darwinbox listing API at https://delhivery.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned 10 live Delhivery listings. Direct non-browser requests to the same listing API returned a Cloudflare 403 during verification, so this scraper uses the repo browser-session Darwinbox pagination pattern.'

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
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-first-party-careers-page+darwinbox-browser-session-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
}

export default DELHIVERY_CATALOG
