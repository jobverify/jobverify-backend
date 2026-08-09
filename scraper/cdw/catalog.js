import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CDW_CATALOG = {
  source: 'cdw',
  companyName: 'CDW',
  officialBrandName: 'CDW',
  adapter: 'script',
  homepageUrl: 'https://www.cdwjobs.com/',
  companyCareerPage: 'https://www.cdwjobs.com/search/jobs',
  companyDomain: 'cdwjobs.com',
  atsPlatform: 'first-party-careers-site',
  countryFilter: 'India',
  paginationStrategy: 'server-rendered-search-results-plus-detail-pages',
  extractionStrategy:
    'verified-search-results-page+india-country-filter-results+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-01',
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that https://www.cdwjobs.com/search/jobs remained the live first-party CDW Job Search Results page, that the Country India filter linked to https://www.cdwjobs.com/search/jobs/in/country/india with 4 open jobs, and that public India detail pages included Senior Consultant-QA in Bangalore and Senior Data Engineer-2 in Hyderabad.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'cdw/jobs.json',
}

export default CDW_CATALOG
