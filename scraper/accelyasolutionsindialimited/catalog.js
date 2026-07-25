import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://w3.accelya.com/careers/ is the live first-party Accelya careers page, that it hands View all jobs to the public Workday board at https://accelya.wd103.myworkdayjobs.com/Careers, that public Workday detail pages are indexable for India roles such as Pune and Mumbai, and that the direct Workday jobs API at https://accelya.wd103.myworkdayjobs.com/wday/cxs/accelya/Careers/jobs currently returns an HTTP_400 or HTTP_500 error payload instead of an enumerable public listing feed. This provider therefore stays fail-closed until the verified Workday enumeration surface stabilizes.'

export const ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG = {
  source: 'accelyasolutionsindialimited',
  companyName: 'Accelya Solutions India Limited',
  officialBrandName: 'Accelya',
  adapter: 'script',
  homepageUrl: 'https://w3.accelya.com/',
  companyCareerPage: 'https://w3.accelya.com/careers/',
  officialWorkdayBoardUrl: 'https://accelya.wd103.myworkdayjobs.com/Careers',
  jobsApiUrl: 'https://accelya.wd103.myworkdayjobs.com/wday/cxs/accelya/Careers/jobs',
  companyDomain: 'w3.accelya.com',
  atsPlatform: 'official-first-party-careers-handoff-workday-api-failure',
  countryFilter: 'India',
  paginationStrategy: 'careers-handoff-plus-workday-api-failure-validation',
  extractionStrategy:
    'verified-careers-page+verified-workday-handoff+verified-workday-http-400-or-500-error-payload+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'accelyasolutionsindialimited/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ACCELYA_SOLUTIONS_INDIA_LIMITED_CATALOG
