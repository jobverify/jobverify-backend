import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIFY_TECHNOLOGIES_CATALOG = {
  source: 'sifytechnologies',
  companyName: 'Sify Technologies',
  officialBrandName: 'Sify Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.sifytechnologies.com/',
  officialAboutPageUrl: 'https://www.sifytechnologies.com/about-us/',
  companyCareerPage: 'https://sifycareer.tallite.com/',
  officialJobsPageUrl: 'https://sifycareer.tallite.com/jobs',
  companyDomain: 'sifytechnologies.com',
  atsPlatform: 'tallite',
  countryFilter: 'India',
  paginationStrategy: 'encrypted-post-body-page-number',
  extractionStrategy:
    'verified-about-page-careers-link+public-tallite-encrypted-job-list+public-tallite-encrypted-job-detail',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  sellerShortCode: 'SIF',
  apiBaseUrl: 'https://www.tallite.com/api_sify/',
  listingApiUrl: 'https://www.tallite.com/api_sify/icrweb/home/tallite_career_portal_job_list?lngId=1&sellerShortCode=SIF',
  detailApiUrl: 'https://www.tallite.com/api_sify/icrweb/home/tallite_career_portal_job_detail?lngId=1&sellerShortCode=SIF',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.sifytechnologies.com/about-us/ exposes a first-party Careers link to https://sifycareer.tallite.com/. The public jobs surface resolves to https://sifycareer.tallite.com/jobs and showed Found 34 Jobs, including Assistant Manager-Network Projects in Mumbai. Public encrypted Tallite APIs at https://www.tallite.com/api_sify/icrweb/home/tallite_career_portal_job_list?lngId=1&sellerShortCode=SIF and https://www.tallite.com/api_sify/icrweb/home/tallite_career_portal_job_detail?lngId=1&sellerShortCode=SIF returned live India job data through the frontend-exposed encryption contract.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sifytechnologies/jobs.json',
}

export default SIFY_TECHNOLOGIES_CATALOG
