export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.asterdmhealthcare.in/ is the live official Aster DM Healthcare India homepage, that its Careers navigation points to the first-party careers page at https://www.asterdmhealthcare.in/careers, and that the first-party careers page hands Explore Jobs / View Openings to the public Oracle Candidate Experience board at https://hcdt.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX. The public India finder at https://hcdt.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions currently exposes 2430 India roles, including Insurance Officer.Insurance.Aster MIMS Kannur (job 31150).'

export const ASTER_DM_HEALTHCARE_CATALOG = {
  source: 'asterdmhealthcare',
  companyName: 'Aster DM Healthcare',
  adapter: 'script',
  modulePath: '../../scraper/asterdmhealthcare/script.js',
  companyCareerPage: 'https://www.asterdmhealthcare.in/careers',
  homepageUrl: 'https://www.asterdmhealthcare.in/',
  companyDomain: 'asterdmhealthcare.in',
  oracleCandidateExperienceUrl: 'https://hcdt.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX',
  workspaceDomain: 'hcdt.fa.us2.oraclecloud.com',
  listingApiBaseUrl: 'https://hcdt.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions',
  detailApiBaseUrl: 'https://hcdt.fa.us2.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails',
  publicJobsBaseUrl: 'https://hcdt.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/',
  siteNumber: 'CX',
  atsPlatform: 'oracle-cloud',
  countryFilter: 'India',
  paginationStrategy: 'offset-query',
  extractionStrategy:
    'verified-official-homepage+verified-first-party-careers-page+oracle-cloud-finder-api+oracle-cloud-detail-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'asterdmhealthcare/jobs.json',
}

export default ASTER_DM_HEALTHCARE_CATALOG

