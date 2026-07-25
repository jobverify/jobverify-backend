import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.anar.biz/ is the live first-party Anar site and currently serves a shutdown explainer with "Anar Business App: A Journey Concluded" and "Why We Shut Down" rather than a careers surface. Verified that https://www.anar.biz/career, https://www.anar.biz/careers, https://www.anar.biz/jobs, https://www.anar.biz/join-us, and https://www.anar.biz/work-with-us each return branded first-party 404 pages. No trustworthy public jobs surface is currently available.'

export const ANAR_BUSINESS_CATALOG = {
  source: 'anarbusiness',
  companyName: 'Anar Business',
  officialBrandName: 'Anar',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.anar.biz/',
  homepageUrl: 'https://www.anar.biz/',
  companyDomain: 'anar.biz',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-shutdown-markers-plus-common-route-validation',
  extractionStrategy: 'verified-homepage-shutdown-explainer+verified-missing-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedMissingCareersUrls: [
    'https://www.anar.biz/career',
    'https://www.anar.biz/careers',
    'https://www.anar.biz/jobs',
    'https://www.anar.biz/join-us',
    'https://www.anar.biz/work-with-us',
  ],
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ANAR_BUSINESS_CATALOG
