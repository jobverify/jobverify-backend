import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDUSTRY_BUYING_CATALOG = {
  source: 'industrybuying',
  companyName: 'IndustryBuying',
  officialBrandName: 'IndustryBuying',
  adapter: 'script',
  companyCareerPage: 'https://jobs.industrybuying.com/jobs',
  officialHomepageUrl: 'https://www.industrybuying.com/',
  officialCareersHandoffPageUrl: 'https://www.industrybuying.com/',
  officialJobsSiteUrl: 'https://jobs.industrybuying.com/',
  careersApiBaseUrl: 'https://careers.industrybuying.com/api/career',
  careersOrgsApiUrl: 'https://careers.industrybuying.com/api/career/orgs',
  careersJobsApiUrl: 'https://careers.industrybuying.com/api/career/jobs',
  expectedOrgId: 'org_1782819232623',
  expectedOrgSlug: 'industrybuying',
  atsPlatform: 'custom-first-party-next-careers-api',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-api-single-page',
  extractionStrategy:
    'verified-first-party-homepage-handoff+verified-first-party-jobs-site+verified-careers-api-jobs-and-details',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'industrybuying.com',
  verifiedOn: '2026-08-07',
  verifiedPublicJobCount: 3,
  verifiedIndiaJobCount: 3,
  verifiedSampleJobTitle: 'Category Group Head',
  verifiedSampleJobUrl: 'https://jobs.industrybuying.com/jobs/detail?id=job_1783396889733',
  verifiedSurfaceSummary:
    'Verified on Friday, August 7, 2026 that the official IndustryBuying homepage at https://www.industrybuying.com/ now links Careers from the footer to the first-party site https://jobs.industrybuying.com/, that the live jobs page resolves to https://jobs.industrybuying.com/jobs, and that the public careers API endpoints https://careers.industrybuying.com/api/career/orgs and https://careers.industrybuying.com/api/career/jobs returned the live org "industrybuying" (org_1782819232623) and 3 public India openings in New Delhi: Category Group Head, Online Sales Executive, and Category Owner. Also verified that job detail data is exposed at https://careers.industrybuying.com/api/career/jobs?id=job_1783396889733 and that the public detail and apply routes use https://jobs.industrybuying.com/jobs/detail?id=... and https://jobs.industrybuying.com/jobs/apply?id=... .',
  dryRunFile: 'industrybuying/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDUSTRY_BUYING_CATALOG
