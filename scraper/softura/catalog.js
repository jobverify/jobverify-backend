import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOFTURA_CATALOG = {
  source: 'softura',
  companyName: 'Softura',
  officialBrandName: 'Softura',
  adapter: 'script',
  homepageUrl: 'https://www.softura.com/',
  companyCareerPage: 'https://www.softura.com/careers/',
  companyDomain: 'softura.com',
  atsPlatform: 'first-party-detail-pages-plus-zoho-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-public-apply-links',
  extractionStrategy:
    'verified-first-party-careers-page+public-apply-now-links+first-party-detail-pages+zoho-detail-pages+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-04',
  verifiedSurfaceSummary:
    'Verified on Tuesday, August 4, 2026 that the first-party Softura careers route at https://www.softura.com/careers/ was publicly reachable again, exposed public Apply Now links to first-party Softura detail pages plus public Zoho Recruit detail pages, and included India-facing roles such as Java Senior Developer in Ahmedabad, Python Senior Software Engineer in Chennai, and Java Developer in Chennai.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'softura/jobs.json',
}

export default SOFTURA_CATALOG
