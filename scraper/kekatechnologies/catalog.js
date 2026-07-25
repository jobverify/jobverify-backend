import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KEKA_TECHNOLOGIES_CATALOG = {
  source: 'kekatechnologies',
  companyName: 'KEKA TECHNOLOGIES',
  officialBrandName: 'Keka Technologies Private Limited',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.keka.com/careers',
  verifiedRolePageUrls: [
    'https://www.keka.com/careers/product-manager',
    'https://www.keka.com/careers/design-roles',
    'https://www.keka.com/marketing-roles',
  ],
  companyDomain: 'keka.com',
  atsPlatform: 'first-party-role-pages-plus-keka-apply-links',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-landing-plus-curated-first-party-role-pages',
  extractionStrategy: 'verified-careers-landing+verified-first-party-role-pages+hr-keka-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'kekatechnologies/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    "Verified on Saturday, July 18, 2026 that https://www.keka.com/careers remains the live first-party Keka careers landing page and links View all Job openings to Keka's hiring portal, while first-party role pages on keka.com publicly expose openings such as Associate Product Manager, Manager Product Designer, and Growth Marketer with Hyderabad location signals and apply links.",
}

export default KEKA_TECHNOLOGIES_CATALOG
