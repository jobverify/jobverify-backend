import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.tatatelebusiness.com/careers/ is the live official Tata Tele Business Services careers page for Tata Teleservices Limited and that it hands candidates to the public Oracle Candidate Experience shell at https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=job-location. Verified the Oracle shell exposes data-apibaseurl https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com:443 with site number CX_1, that the public India finder at https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions returned 13 India roles on the verified date, and that the public detail API is live for Product Sales Specialist - IAAS (job 2258) in Pune, Maharashtra, India.'

export const TATA_TELESERVICES_CATALOG = {
  source: 'tatateleservices',
  companyName: 'Tata Teleservices',
  officialBrandName: 'Tata Teleservices Limited',
  adapter: 'script',
  homepageUrl: 'https://www.tatatelebusiness.com/',
  companyCareerPage: 'https://www.tatatelebusiness.com/careers/',
  officialJobsHandoffUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=job-location',
  oracleCandidateExperienceUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/jobs?mode=job-location',
  workspaceDomain: 'fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com',
  listingApiBaseUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/',
  siteNumber: 'CX_1',
  companyDomain: 'tatatelebusiness.com',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query',
  extractionStrategy:
    'verified-first-party-careers-handoff+verified-oracle-candidate-shell+oracle-cloud-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedIndiaJobCount: 13,
  verifiedSampleJobUrl:
    'https://fa-evmm-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/2258',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'tatateleservices/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TATA_TELESERVICES_CATALOG
