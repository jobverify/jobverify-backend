import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QUESS_CORP_CATALOG = {
  source: 'quesscorp',
  companyName: 'Quess Corp',
  officialBrandName: 'Quess Corp',
  adapter: 'script',
  homepageUrl: 'https://www.quesscorp.com/',
  companyCareerPage: 'https://careers.quesscorp.com/',
  officialJobsHandoffUrl:
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
  oracleCandidateExperienceUrl:
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  workspaceDomain: 'fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com',
  listingApiBaseUrl:
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl:
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl:
    'https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  siteNumber: 'CX_1',
  companyDomain: 'quesscorp.com',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query',
  extractionStrategy:
    'verified-first-party-careers-handoff+verified-oracle-candidate-shell+oracle-cloud-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedIndiaJobCount: 2421,
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://careers.quesscorp.com/ is the live first-party Quess Careers surface and that it hands applicants to the public Oracle Candidate Experience board at https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs via the official requisitions handoff URL. The public India finder at https://fa-eumz-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions currently exposes 2421 India roles, including Consultant - Recruitment (job 12103) in Bangalore, Karnataka, India.',
  dryRunFile: 'quesscorp/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default QUESS_CORP_CATALOG
