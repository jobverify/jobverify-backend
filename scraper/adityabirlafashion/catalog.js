import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ADITYA_BIRLA_FASHION_CATALOG = {
  source: 'adityabirlafashion',
  companyName: 'Aditya Birla Fashion',
  officialBrandName: 'Aditya Birla Fashion and Retail',
  legalEntityName: 'Aditya Birla Fashion and Retail Limited',
  adapter: 'script',
  companyCareerPage: 'https://www.abfrl.com/careers/',
  companyDomain: 'abfrl.com',
  officialCareersHandoffUrl: 'https://careers.adityabirla.com/fashion-retail',
  groupJobSearchUrl: 'https://careers.adityabirla.com/job-search',
  storeManagerOpeningsUrl: 'https://abfrlcareers.peoplestrong.com/home',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-zero-vacancy-group-handoffs-plus-broken-store-manager-handoff',
  extractionStrategy:
    'verified-official-careers-page+verified-fashion-retail-zero-vacancy-page+verified-group-job-search-zero-vacancy-page+verified-broken-abfrl-store-manager-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.abfrl.com/careers/ is the live first-party ABFRL careers page, it links View More Openings to https://careers.adityabirla.com/fashion-retail where the Fashion & Retail surface currently says No Jobs Available, the broader group search at https://careers.adityabirla.com/job-search shows 0 jobs, and the Store Manager Openings in ABFRL handoff at https://abfrlcareers.peoplestrong.com/home is broken with a 404. No trustworthy public jobs surface is currently available for Aditya Birla Fashion.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ADITYA_BIRLA_FASHION_CATALOG
