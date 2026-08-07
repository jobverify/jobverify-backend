import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOTIVITYLABS_CATALOG = {
  source: 'motivitylabs',
  companyName: 'MotivityLabs',
  officialBrandName: 'Motivity Labs',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'motivitylabs/jobs.json',
  companyCareerPage: 'https://motivitylabs.com/careers/',
  officialCareersPageUrl: 'https://motivitylabs.com/job-openings/',
  companyDomain: 'motivitylabs.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-job-openings-pages',
  extractionStrategy: 'verified-first-party-job-openings+same-domain-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://motivitylabs.com/careers/ remained the live first-party Motivity Labs careers page, that it still hands applicants to the first-party openings hub at https://motivitylabs.com/job-openings/, and that the openings hub publicly lists current India roles such as Sr.Test Engineer, Technical Solution Architect Experience, Senior AI/ML & Gen AI Engineer, and Looker Developer with same-domain detail pages under https://motivitylabs.com/jobs/.',
}

export default MOTIVITYLABS_CATALOG
