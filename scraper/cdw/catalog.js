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
    'verified-search-results-page+server-rendered-india-job-cards+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.cdwjobs.com/search/jobs was the live first-party CDW Job Search Results page, that it server-rendered Country India (5 jobs), and that public India detail pages included roles such as Senior Data Engineer-2 in Hyderabad and Data Engineer(Consultant)-1 in Chennai.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'cdw/jobs.json',
}

export default CDW_CATALOG
