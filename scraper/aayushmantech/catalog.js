import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AAYUSHMAN_TECH_CATALOG = {
  source: 'aayushmantech',
  companyName: 'Aayushman Tech',
  officialBrandName: 'Aayushman Technologies',
  legalEntityName: 'Aayushman Tech Services Pvt. Ltd.',
  adapter: 'script',
  companyCareerPage: 'https://www.aayushmantech.com/',
  companyDomain: 'aayushmantech.com',
  companyPageUrl: 'https://www.aayushmantech.com/company',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-company-page-plus-common-careers-route-404-validation',
  extractionStrategy: 'verified-homepage+verified-company-page+verified-missing-common-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-14',
  verifiedSurfaceSummary:
    'Verified on July 14, 2026 that https://www.aayushmantech.com/ is the live first-party marketing site for Aayushman Technologies / Aayushman Tech Services Pvt. Ltd., https://www.aayushmantech.com/company is the live company page, and the official site exposes no trustworthy public jobs surface. Common first-party careers routes currently return 404 responses.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AAYUSHMAN_TECH_CATALOG
