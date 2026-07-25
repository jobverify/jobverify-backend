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
  contactPageUrl: 'https://www.shoregrp.com/get-started',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-common-careers-route-validation',
  extractionStrategy: 'verified-homepage+verified-contact-page+verified-missing-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.shoregrp.com/ was the live first-party Shore Group site for the Shore Infotech India business family and that https://www.shoregrp.com/get-started was the live contact route, but no trustworthy public careers or jobs surface was exposed on the verified first-party routes.',
  dryRunFile: 'shoreinfotechindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SHORE_INFOTECH_INDIA_CATALOG
