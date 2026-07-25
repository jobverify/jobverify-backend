import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const APPS_ASSOCIATES_CATALOG = {
  source: 'appsassociates',
  companyName: 'Apps Associates',
  officialBrandName: 'Apps Associates',
  adapter: 'script',
  homepageUrl: 'https://appsassociates.com/',
  companyCareerPage: 'https://appsassociates.com/careers/',
  atsPlatform: 'official-company-careers-no-public-jobs-catalog',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+job-openings-cta+online-application-faq+no-public-job-catalog',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'appsassociates.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://appsassociates.com/careers/ is the exact Apps Associates careers page, that it includes See Our Current Job Openings CTAs plus online application FAQ content, and that the public HTML exposes no trustworthy public jobs catalog or inline role inventory.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default APPS_ASSOCIATES_CATALOG
