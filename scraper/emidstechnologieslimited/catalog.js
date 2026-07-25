import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EMIDS_TECHNOLOGIES_LIMITED_CATALOG = {
  source: 'emidstechnologieslimited',
  companyName: 'Emids Technologies Limited',
  officialBrandName: 'Emids',
  adapter: 'script',
  homepageUrl: 'https://www.emids.com/',
  companyCareerPage: 'https://www.emids.com/careers/',
  oracleCandidateExperienceUrl:
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  workspaceDomain: 'fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com',
  listingApiBaseUrl:
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl:
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl:
    'https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  siteNumber: 'CX_1',
  companyDomain: 'emids.com',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query',
  extractionStrategy: 'verified-first-party-careers-page+oracle-cloud-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 6,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.emids.com/careers/ remained the first-party Emids careers page and that its Explore Open Roles CTA handed candidates to the public Oracle Candidate Experience board at https://fa-eupt-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs. The public India finder returned 6 India jobs including Business Analyst and Architect on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default EMIDS_TECHNOLOGIES_LIMITED_CATALOG
