import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BAJAJ_AUTO_CATALOG = {
  source: 'bajajauto',
  companyName: 'Bajaj Auto',
  officialBrandName: 'Bajaj Auto Limited',
  adapter: 'script',
  homepageUrl: 'https://www.bajajauto.com/',
  careersHubUrl: 'https://www.bajajauto.com/careers',
  careersHubFinalUrl: 'https://www.bajajauto.com/careers/why-us',
  companyCareerPage: 'https://www.bajajauto.com/careers/search-result',
  careerHeaderScriptUrl: 'https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271',
  requisitionsApiUrl: 'https://www.bajajauto.com/handlers/careers/get-requisitions.ashx',
  jobTypesApiUrl: 'https://www.bajajauto.com/handlers/careers/get-job-types.ashx',
  sampleDetailUrl: 'https://www.bajajauto.com/careers/job/mgr/14413',
  applicationTrackingUrl:
    'https://career10.successfactors.com/career?career_company=BAL&lang=en_GB&company=BAL&site=&loginFlowRequired=true',
  companyDomain: 'bajajauto.com',
  atsPlatform: 'first-party-careers-api',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-requisitions-api-feed',
  extractionStrategy:
    'verified-homepage+verified-careers-hub+verified-search-results-page+verified-career-header-bundle+first-party-requisitions-api+verified-detail-shell',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-19',
  verifiedSurfaceSummary:
    'Verified on July 19, 2026 that https://www.bajajauto.com/ is the live Bajaj Auto homepage, that https://www.bajajauto.com/careers redirects to the first-party careers hub at https://www.bajajauto.com/careers/why-us, and that the public jobs surface lives on https://www.bajajauto.com/careers/search-result. Verified the first-party careers bundle at https://cdn.bajajauto.com/js/new-design/js/career-header.js?v=271 loads public listings from https://www.bajajauto.com/handlers/careers/get-requisitions.ashx and job-family metadata from https://www.bajajauto.com/handlers/careers/get-job-types.ashx, and verified the sample first-party detail shell at https://www.bajajauto.com/careers/job/mgr/14413 exposes the public Apply Now surface plus application tracking login handoff.',
  dryRunFile: 'bajajauto/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BAJAJ_AUTO_CATALOG
