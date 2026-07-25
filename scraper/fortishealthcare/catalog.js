import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FORTIS_HEALTHCARE_CATALOG = {
  source: 'fortishealthcare',
  companyName: 'Fortis Healthcare',
  officialBrandName: 'Fortis Healthcare Limited',
  adapter: 'script',
  homepageUrl: 'https://www.fortishealthcare.com/',
  companyCareerPage: 'https://www.fortishealthcare.com/careers',
  officialCareersResolvedUrl: 'https://www.fortishealthcare.com/careers-at-Fortis-basic',
  companyDomain: 'fortishealthcare.com',
  oracleCandidateExperienceUrl:
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs',
  workspaceDomain: 'fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com',
  listingApiBaseUrl:
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl:
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl:
    'https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  siteNumber: 'CX_1',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query',
  extractionStrategy:
    'verified-first-party-careers-handoff+verified-oracle-candidate-shell+oracle-cloud-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.fortishealthcare.com/ is the live official Fortis Healthcare homepage, that https://www.fortishealthcare.com/careers redirects to https://www.fortishealthcare.com/careers-at-Fortis-basic, and that the first-party careers page hands applicants to the public Oracle Candidate Experience board at https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs. The public India finder at https://fa-ermg-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions currently exposes 1147 India roles for Fortis Healthcare Limited, including Attending Consultant Anaesthesiology (job 11751) in Mumbai, Maharashtra, India.',
  dryRunFile: 'fortishealthcare/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FORTIS_HEALTHCARE_CATALOG
