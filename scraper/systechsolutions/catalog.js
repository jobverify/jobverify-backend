import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://systechusa.com/careers/ is the live first-party Systech Solutions careers page, that it advertises "Open positions & life at Systech" and Chennai, India, and that its embedded Azure Logic Apps jobs-list endpoint returned an empty array while the page still links US Job Openings at https://systechusa.com/careers-us/. Because the exact-name public jobs surface currently exposes no India listings, this local provider remains fail-closed and returns an empty array until the embedded first-party jobs API publishes verifiable openings.'

export const SYSTECH_SOLUTIONS_CATALOG = {
  source: 'systechsolutions',
  companyName: 'Systech Solutions',
  officialBrandName: 'Systech Solutions',
  adapter: 'script',
  homepageUrl: 'https://systechusa.com/',
  companyCareerPage: 'https://systechusa.com/careers/',
  officialCareersPageUrl: 'https://systechusa.com/careers/',
  embeddedJobsListApiUrl:
    'https://prod-171.westus.logic.azure.com:443/workflows/67e48103c49d4bb78d575f18cebb36c1/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=0AvRedg1d2FnScRDeHgN_FJM9mUgKuZaInXLg5Fy_Lc',
  embeddedJobsDetailApiUrl:
    'https://prod-125.westus.logic.azure.com:443/workflows/9c049c250c2b4aed831092094d3c61f0/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=O_necFuH-pBhqeGk6KKpYwNEP1f0ax4lxGEPWbZ1kBA',
  usOpeningsPageUrl: 'https://systechusa.com/careers-us/',
  companyDomain: 'systechusa.com',
  atsPlatform: 'first-party-careers-page-empty-embedded-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-empty-embedded-jobs-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-empty-embedded-jobs-api+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'systechsolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SYSTECH_SOLUTIONS_CATALOG
