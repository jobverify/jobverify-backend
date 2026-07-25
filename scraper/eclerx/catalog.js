import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ECLERX_CATALOG = {
  source: 'eclerx',
  companyName: 'eClerx',
  officialBrandName: 'eClerx',
  adapter: 'script',
  officialHomepageUrl: 'https://eclerx.com/',
  officialCareersLandingUrl: 'https://eclerx.com/careers/',
  companyCareerPage: 'https://eclerx.com/job-portal/',
  oracleCandidateExperienceUrl:
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  workspaceDomain: 'fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com',
  listingApiBaseUrl:
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl:
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl:
    'https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  siteNumber: 'CX_1',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query-location-filter',
  extractionStrategy:
    'verified-first-party-careers-pages+oracle-cloud-candidate-experience+oracle-cloud-india-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eclerx.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://eclerx.com/careers/ is the live first-party careers landing page and that its Explore jobs CTA hands candidates to the first-party job portal at https://eclerx.com/job-portal/. The first-party job portal hands applicants to the public Oracle Candidate Experience board at https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs. The public India finder at https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India returned 261 India jobs, including Analyst in Chandigarh, India and Senior Analyst in Mumbai, Maharashtra, India, and the public detail API is live at https://fa-ewji-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails?expand=all&onlyData=true&finder=ById;Id=%2281338%22,siteNumber=CX_1.',
  dryRunFile: 'eclerx/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ECLERX_CATALOG
