import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TRICON_INFOTECH_CATALOG = {
  source: 'triconinfotech',
  companyName: 'Tricon Infotech',
  officialBrandName: 'Tricon Infotech',
  adapter: 'script',
  homepageUrl: 'https://www.triconinfotech.com/',
  companyCareerPage: 'https://www.triconinfotech.com/tricon-careers/',
  jobsApiUrl: 'https://www.triconinfotech.com/wp-json/wp/v2/awsm_job_openings?_fields=id,link,title,content,class_list&per_page=100&page=1',
  companyDomain: 'triconinfotech.com',
  atsPlatform: 'awsm-jobs-empty-shell',
  countryFilter: 'India',
  paginationStrategy: 'careers-page-plus-empty-awsm-feed-validation',
  extractionStrategy: 'verified-awsm-shell+empty-first-party-feed-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.triconinfotech.com/tricon-careers/ is the live first-party Tricon careers page, that it still loads the AWSM jobs shell, and that the first-party REST feed at https://www.triconinfotech.com/wp-json/wp/v2/awsm_job_openings?_fields=id,link,title,content,class_list&per_page=5&page=1 returned an empty array instead of public role cards.',
  dryRunFile: 'triconinfotech/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TRICON_INFOTECH_CATALOG
