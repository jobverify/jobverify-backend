import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://insuremile.in/careers/ is the live first-party InsureMile careers page, that it serves wp-job-openings public assets plus inline awsmJobsPublic configuration on the official domain, and that the public REST feed at https://insuremile.in/wp-json/wp/v2/awsm_job_openings?_fields=id,link,title,content,class_list&per_page=100&page=1 returned five live openings on the same first-party /career/ detail URLs while omitting the separately expired Team Lead-Renewal Service card shown in the archive HTML.'

export const INSUREMILE_CATALOG = {
  source: 'insuremile',
  companyName: 'InsureMile',
  officialBrandName: 'Insuremile',
  adapter: 'script',
  homepageUrl: 'https://insuremile.in/',
  companyCareerPage: 'https://insuremile.in/careers/',
  careerApiUrl: 'https://insuremile.in/wp-json/wp/v2/awsm_job_openings',
  companyDomain: 'insuremile.in',
  atsPlatform: 'wp-job-openings',
  countryFilter: 'India',
  paginationStrategy: 'wp-json-page-query',
  extractionStrategy: 'verified-first-party-careers-page+awsm-rest-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'insuremile/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INSUREMILE_CATALOG
