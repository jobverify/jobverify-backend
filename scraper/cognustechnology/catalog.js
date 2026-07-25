import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const COGNUS_TECHNOLOGY_CATALOG = {
  source: 'cognustechnology',
  companyName: 'Cognus Technology',
  officialBrandName: 'Cognus Technology',
  adapter: 'script',
  homepageUrl: 'https://www.cognustechnology.com/',
  companyCareerPage: 'https://cognustechnology.zohorecruit.in/jobs/Careers',
  atsPlatform: 'zoho-recruit-careers-site',
  countryFilter: 'India',
  paginationStrategy: 'single-hidden-input-json-payload',
  extractionStrategy: 'verified-first-party-homepage+official-zoho-careers-hidden-input-jobs-payload',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cognustechnology.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the exact first-party Cognus Technology homepage links "Join Us" to the public Zoho Recruit board at https://cognustechnology.zohorecruit.in/jobs/Careers, and that the official careers board renders the Cognus Technology empty state "Currently we don\'t have any open jobs at Cognus Technology. Check out our page sometime later." while still exposing the trusted hidden-input jobs payload contract.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default COGNUS_TECHNOLOGY_CATALOG
