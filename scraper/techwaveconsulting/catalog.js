import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TECHWAVE_CONSULTING_CATALOG = {
  source: 'techwaveconsulting',
  companyName: 'Techwave Consulting',
  officialBrandName: 'Techwave',
  adapter: 'script',
  companyCareerPage: 'https://www.techwave.com/career/',
  officialCareersPageUrl: 'https://www.techwave.com/career/',
  officialWorkdayBoardUrl: 'https://techwave.wd108.myworkdayjobs.com/TechWave_Careers',
  jobsApiUrl: 'https://techwave.wd108.myworkdayjobs.com/wday/cxs/techwave/TechWave_Careers/jobs',
  verifiedIndiaLocationDescriptors: [
    'Bangalore',
    'GDC Financial District',
    'GDC HiTech',
    'Khammam',
  ],
  companyDomain: 'techwave.com',
  atsPlatform: 'workday-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'first-party-workday-jobs-api',
  extractionStrategy: 'verified-first-party-careers-shell+public-workday-board+india-location-facets+jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.techwave.com/career/ is the live first-party Techwave careers shell, that it links to the public Workday board at https://techwave.wd108.myworkdayjobs.com/TechWave_Careers, and that the Workday jobs API at https://techwave.wd108.myworkdayjobs.com/wday/cxs/techwave/TechWave_Careers/jobs exposed India location facets including Bangalore, GDC Financial District, GDC HiTech, and Khammam along with live India roles such as Sr. Data Architect (Databricks), Service Delivery Manager – AI/ML and Data, Cloud Network Architect, and Product Designer.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'techwaveconsulting/jobs.json',
}

export default TECHWAVE_CONSULTING_CATALOG
