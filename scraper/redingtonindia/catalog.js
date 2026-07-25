import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const REDINGTON_INDIA_CATALOG = {
  source: 'redingtonindia',
  companyName: 'Redington India',
  officialBrandName: 'Redington',
  adapter: 'script',
  companyCareerPage: 'https://redingtongroup.com/careers/',
  officialCareersPageUrl: 'https://redingtongroup.com/careers/',
  jobsApiUrl: 'https://redingtongroup.com/wp-admin/admin-ajax.php',
  jobDetailsUrlTemplate:
    'https://hrpulserlgroup.darwinbox.in/ms/candidatev2/main/careers/jobDetails/{jobId}?from=all',
  companyDomain: 'redingtongroup.com',
  atsPlatform: 'wordpress-admin-ajax+darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'offset-based-admin-ajax-until-empty',
  extractionStrategy:
    'verified-first-party-careers-page+verified-admin-ajax-actions+darwinbox-detail-url-template',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://redingtongroup.com/careers/ is the live first-party Redington careers page, that it exposes the Search Jobs shell plus the verified inline admin-ajax actions get_countries, get_skills, and get_jobs behind a page nonce, and that POST requests to https://redingtongroup.com/wp-admin/admin-ajax.php returned five live India jobs at offset 0 with an empty response at offset 5, including Area Sales Manager and Territory Sales Manager, with full-job-detail handoff URLs on the Darwinbox domain.',
  dryRunFile: 'redingtonindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default REDINGTON_INDIA_CATALOG
