import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://paytm.com/careers is the live official Paytm careers page, that its Apply Now and View All Roles calls-to-action hand candidates to the public Lever board at https://jobs.lever.co/paytm, and that the public Lever postings API at https://api.lever.co/v0/postings/paytm?mode=json returned 238 public postings and 230 India postings including Accounts Payable Specialist in Noida, Uttar Pradesh and Ad Sales (KAM) - DM/ Sr. Manager - Paytm Ads - Bangalore in Bangalore, Karnataka.'

export const PAYTM_CATALOG = {
  source: 'paytm',
  companyName: 'Paytm',
  officialBrandName: 'Paytm',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'paytm/jobs.json',
  homepageUrl: 'https://paytm.com/',
  companyCareerPage: 'https://paytm.com/careers',
  companyDomain: 'paytm.com',
  officialLeverBoardUrl: 'https://jobs.lever.co/paytm',
  leverApiUrl: 'https://api.lever.co/v0/postings/paytm?mode=json',
  verifiedSampleJobUrl: 'https://jobs.lever.co/paytm/8182f4b5-4dcb-4d3d-87fc-93a0d8730d3d',
  verifiedPublicJobCount: 238,
  verifiedIndiaJobCount: 230,
  atsPlatform: 'lever',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-validation-plus-lever-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-lever-board+lever-postings-api+india-country-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default PAYTM_CATALOG
