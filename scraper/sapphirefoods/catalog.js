import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that the official Sapphire Foods careers landing page at https://www.sapphire.terbiumsolutions.com/careers links to live public role pages at https://www.sapphire.terbiumsolutions.com/careers/store-careers and https://www.sapphire.terbiumsolutions.com/careers/corporate-careers. The store careers page publicly listed roles including Assistant Restaurant Manager, while the corporate careers page publicly listed roles including Manager - Treasury ( Finance & Accounts), with visible role titles, brands, locations, vacancies, and Know More links on the verified date.'

export const SAPPHIRE_FOODS_CATALOG = {
  source: 'sapphirefoods',
  companyName: 'Sapphire Foods',
  officialBrandName: 'Sapphire Foods India Ltd.',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sapphirefoods/jobs.json',
  officialHomepageUrl: 'https://www.sapphirefoods.in/',
  companyCareerPage: 'https://www.sapphire.terbiumsolutions.com/careers',
  storeCareersPageUrl: 'https://www.sapphire.terbiumsolutions.com/careers/store-careers',
  corporateCareersPageUrl: 'https://www.sapphire.terbiumsolutions.com/careers/corporate-careers',
  resolvedCareersHost: 'www.sapphire.terbiumsolutions.com',
  companyDomain: 'sapphirefoods.in',
  atsPlatform: 'official-company-site-public-role-pages',
  countryFilter: 'India',
  paginationStrategy: 'official-store-and-corporate-pages-no-pagination',
  extractionStrategy:
    'verified-careers-landing+verified-store-careers-page+verified-corporate-careers-page+role-card-link-extraction',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedSampleStoreRoleTitle: 'Assistant Restaurant Manager',
  verifiedSampleCorporateRoleTitle: 'Manager - Treasury ( Finance & Accounts)',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default SAPPHIRE_FOODS_CATALOG
