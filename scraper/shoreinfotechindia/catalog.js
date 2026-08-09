import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SHORE_INFOTECH_INDIA_CATALOG = {
  source: 'shoreinfotechindia',
  companyName: 'Shore Infotech India',
  officialBrandName: 'Shore Group',
  adapter: 'script',
  companyCareerPage: 'https://www.shoregrp.com/',
  companyDomain: 'shoregrp.com',
  contactPageUrl: 'https://www.shoregrp.com/contact',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-common-careers-route-validation',
  extractionStrategy: 'verified-homepage+verified-contact-page+verified-missing-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-27',
  verifiedSurfaceSummary:
    'Verified on Monday, July 27, 2026 that https://www.shoregrp.com/ remained the live first-party Shore Group site for the Shore Infotech India business family, that the contact handoff had moved to https://www.shoregrp.com/contact, and that common first-party careers routes such as /careers, /jobs, /join-us, and /openings still returned empty 404 surfaces rather than a trustworthy public careers or jobs page.',
  dryRunFile: 'shoreinfotechindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SHORE_INFOTECH_INDIA_CATALOG
