import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PEOPLESTRONG_TECHNOLOGIES_CATALOG = {
  source: 'peoplestrongtechnologies',
  companyName: 'PeopleStrong Technologies',
  officialBrandName: 'PeopleStrong',
  adapter: 'script',
  homepageUrl: 'https://careers.peoplestrong.com/',
  companyCareerPage: 'https://careers.peoplestrong.com/',
  jobListUrl: 'https://careers.peoplestrong.com/job/joblist',
  alternateJobListUrl: 'https://careers.peoplestrong.com/job/openings',
  jobsApiUrl: 'https://careers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  sampleJobDetailUrl: 'https://careers.peoplestrong.com/job/detail/PST_SDE_1615631',
  companyDomain: 'careers.peoplestrong.com',
  atsPlatform: 'official-company-careers-api',
  countryFilter: 'India',
  paginationStrategy: 'portal-shell-plus-broken-public-list-routes-validation',
  extractionStrategy:
    'verified-official-portal-shell+verified-broken-public-list-routes+verified-public-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that https://careers.peoplestrong.com/ is the live first-party PeopleStrong careers portal shell and that a public sample detail route such as https://careers.peoplestrong.com/job/detail/PST_SDE_1615631 resolves on the same first-party origin. The public list routes https://careers.peoplestrong.com/job/joblist and https://careers.peoplestrong.com/job/openings still return 404 shell responses, but the public jobs API at https://careers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20 now returns live requisitions again, so the scraper uses the verified first-party API as the public jobs source.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'peoplestrongtechnologies/jobs.json',
}

export default PEOPLESTRONG_TECHNOLOGIES_CATALOG
