import { fileURLToPath } from 'node:url'

const modulePath = fileURLToPath(new URL('./script.js', import.meta.url))

export const OPTISOL_BUSINESS_SOLUTIONS_CATALOG = {
  source: 'optisolbusinesssolutions',
  companyName: 'OptiSol Business Solutions',
  officialBrandName: 'OptiSol',
  adapter: 'script',
  modulePath,
  homepageUrl: 'https://www.optisolbusiness.com/join-with-us',
  companyCareerPage: 'https://www.optisolbusiness.com/job-type/full-time',
  currentOpeningsUrl: 'https://www.optisolbusiness.com/current-openings',
  companyDomain: 'optisolbusiness.com',
  atsPlatform: 'first-party-wordpress-job-pages',
  countryFilter: 'India',
  paginationStrategy: 'wordpress-job-type-archive',
  extractionStrategy: 'verified-careers-landing+job-type-archive+same-domain-job-detail-pages',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.optisolbusiness.com/join-with-us and https://www.optisolbusiness.com/job-type/full-time were the live first-party careers surfaces and that same-domain job pages included Solution Architect and Senior Sales Development Representative.',
}

export default OPTISOL_BUSINESS_SOLUTIONS_CATALOG
