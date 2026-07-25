import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ADITYA_BIRLA_GROUP_CATALOG = {
  source: 'adityabirlagroup',
  companyName: 'Aditya Birla Group',
  adapter: 'script',
  companyCareerPage: 'https://careers.adityabirla.com/',
  companyDomain: 'careers.adityabirla.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-public-job-search-shell',
  extractionStrategy:
    'verified-official-homepage+verified-careers-homepage+verified-job-search-zero-jobs-shell+peoplestrong-register-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  homepageUrl: 'https://www.adityabirla.com/',
  jobSearchUrl: 'https://careers.adityabirla.com/job-search',
  uploadCvUrl: 'https://abgcareers.peoplestrong.com/register',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.adityabirla.com/ is the public Aditya Birla Group corporate homepage, https://careers.adityabirla.com/ is the first-party careers homepage, and https://careers.adityabirla.com/job-search is the live public jobs surface. The job-search page currently shows 0 jobs with a "No Jobs Available" empty state and hands applicants to the official PeopleStrong resume register at https://abgcareers.peoplestrong.com/register.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ADITYA_BIRLA_GROUP_CATALOG
