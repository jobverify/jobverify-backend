import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.hdfcsec.com/ is the live first-party HDFC securities homepage and links Careers in the footer to https://www.hdfcsec.com/Careers. Verified that the official careers page links directly to the public Darwinbox candidate home at https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home, that the public all-jobs route resolves at https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/allJobs, and that the browser-session candidate API at https://hdfcsecurities.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main returned 15 public jobs. Direct non-browser requests to the same Darwinbox API returned a Cloudflare 403 during verification.'

export const HDFC_SECURITIES_CATALOG = {
  source: 'hdfcsecurities',
  companyName: 'HDFC Securities',
  officialBrandName: 'HDFC securities',
  adapter: 'script',
  homepageUrl: 'https://www.hdfcsec.com/',
  companyCareerPage: 'https://www.hdfcsec.com/Careers',
  companyDomain: 'hdfcsec.com',
  officialCareersHandoffUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home',
  darwinboxOrigin: 'https://hdfcsecurities.darwinbox.in',
  darwinboxCompanyId: 'main',
  publicPortalHomeUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/home',
  publicAllJobsUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  listingApiUrl: 'https://hdfcsecurities.darwinbox.in/ms/candidateapi/job/alljobs?companyId=main',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-homepage-plus-careers-page-and-darwinbox-browser-session-listing-api',
  extractionStrategy: 'verified-homepage+verified-careers-page+darwinbox-browser-session-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'hdfcsecurities/jobs.json',
}

export default HDFC_SECURITIES_CATALOG
