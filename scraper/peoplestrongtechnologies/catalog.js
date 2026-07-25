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
  atsPlatform: 'official-company-careers-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'portal-shell-plus-broken-public-list-routes-validation',
  extractionStrategy:
    'verified-official-portal-shell+verified-broken-public-list-routes+verified-broken-public-jobs-api+no-stable-public-list-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.peoplestrong.com/ is the live first-party PeopleStrong careers portal shell and that a public sample detail route such as https://careers.peoplestrong.com/job/detail/PST_SDE_1615631 resolves on the same first-party origin. However, the public list routes https://careers.peoplestrong.com/job/joblist and https://careers.peoplestrong.com/job/openings both returned 404 shell responses during verification, and the public jobs API at https://careers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20 returned the backend error "Could not find method getRequisitionListWithPaginationBySolrBundle" instead of live requisitions. Because the current first-party public listing surface is not stable, the local provider fails closed and returns an empty result until PeopleStrong restores a trustworthy public jobs feed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'peoplestrongtechnologies/jobs.json',
}

export default PEOPLESTRONG_TECHNOLOGIES_CATALOG
