import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ALLIED_DIGITAL_SERVICES_CATALOG = {
  source: 'allieddigitalservices',
  companyName: 'Allied Digital Services',
  officialBrandName: 'Allied Digital Services Ltd',
  adapter: 'script',
  companyCareerPage: 'https://www.allieddigital.net/careers/',
  companyDomain: 'allieddigital.net',
  hiringNowPageUrl: 'https://www.allieddigital.net/job-openings/',
  jobsApiUrl: 'https://www.allieddigital.net/wp-json/wp/v2/awsm_job_openings',
  atsPlatform: 'wordpress-job-openings',
  countryFilter: 'India',
  paginationStrategy: 'count-checked-wordpress-rest-pages-plus-public-opening-card-reconciliation',
  extractionStrategy: 'verified-first-party-careers+complete-published-wordpress-inventory+verified-jobposting-and-application-detail+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-08',
  verifiedSurfaceSummary:
    'Verified on October 8, 2026 that the redesigned https://www.allieddigital.net/ links to https://www.allieddigital.net/careers/, the historical India Hiring Now route redirects to https://www.allieddigital.net/job-openings/, and the first-party WordPress REST inventory at https://www.allieddigital.net/wp-json/wp/v2/awsm_job_openings reports three published jobs matching the opening cards. All three first-party detail pages expose matching JobPosting metadata and application job IDs for Navi Mumbai, India. Service Desk Executive L3 and Endpoint Administrator publish no description; Network Engineer L3 publishes responsibilities and skills. The previous geolocation landing page and India table/detail routes have been replaced.',
  dryRunFile: 'allieddigitalservices/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ALLIED_DIGITAL_SERVICES_CATALOG
