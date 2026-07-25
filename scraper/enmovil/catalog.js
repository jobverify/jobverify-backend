import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ENMOVIL_CATALOG = {
  source: 'enmovil',
  companyName: 'Enmovil',
  officialBrandName: 'Enmovil',
  adapter: 'script',
  homepageUrl: 'https://www.enmovil.ai/',
  companyCareerPage: 'https://www.enmovil.ai/careers',
  sitemapUrl: 'https://www.enmovil.ai/sitemap.xml',
  checkedJobsRouteUrl: 'https://www.enmovil.ai/jobs',
  companyDomain: 'enmovil.ai',
  atsPlatform: 'official-company-careers-nonlisting',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-placeholder-plus-sitemap-and-jobs-404-validation',
  extractionStrategy:
    'verified-homepage+verified-sitemap-careers-url+verified-coming-soon-careers-page+verified-jobs-route-404-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.enmovil.ai/ is the live official Enmovil homepage, that https://www.enmovil.ai/sitemap.xml includes the first-party careers URL https://www.enmovil.ai/careers, that the official careers page currently shows only "Coming soon" without trustworthy public job listings or ATS handoffs, and that https://www.enmovil.ai/jobs returns a first-party Page Not Found shell instead of a live jobs board. There is no trustworthy public jobs surface for Enmovil at the verified first-party URLs.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'enmovil/jobs.json',
}

export default ENMOVIL_CATALOG
