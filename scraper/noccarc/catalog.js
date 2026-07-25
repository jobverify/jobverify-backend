import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NOCCARC_CATALOG = {
  source: 'noccarc',
  companyName: 'Noccarc',
  officialBrandName: 'Noccarc Robotics Pvt Ltd',
  adapter: 'script',
  companyCareerPage: 'https://www.noccarc.com/careers',
  publicJobListingHost: 'naukri.com',
  companyDomain: 'noccarc.com',
  countryFilter: 'India',
  paginationStrategy: 'single-page-listing-with-first-party-outbound-role-links',
  extractionStrategy: 'verified-first-party-careers-page+outbound-naukri-role-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.noccarc.com/careers is the live first-party Noccarc careers page, that the page publicly lists active roles such as Regional Sales Manager - South, Clinical Application Specialist- South, Senior Firmware Engineer, and UI/UX Designer, and that the visible role cards hand off to public Naukri job-listing URLs on naukri.com from the first-party surface. Noccarc should be integrated as a real first-party careers scraper that preserves the official page titles while carrying through the outbound public role links.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NOCCARC_CATALOG
