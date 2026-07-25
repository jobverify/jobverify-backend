import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.marolix.com/ is the live Marolix Technology Solutions homepage, https://www.marolix.com/contact-us is the live first-party contact page, and the direct first-party route https://www.marolix.com/careers did not expose a trustworthy public jobs surface. No trustworthy public jobs surface is currently exposed.'

export const MAROLIX_TECHNOLOGY_SOLUTIONS_CATALOG = {
  source: 'marolixtechnologysolutions',
  companyName: 'Marolix Technology Solutions',
  officialBrandName: 'Marolix Technology Solutions Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://www.marolix.com/',
  companyCareerPage: 'https://www.marolix.com/careers',
  contactPageUrl: 'https://www.marolix.com/contact-us',
  companyDomain: 'marolix.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-common-careers-route-validation',
  extractionStrategy: 'verified-homepage+verified-contact-page+verified-missing-careers-route-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'marolixtechnologysolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MAROLIX_TECHNOLOGY_SOLUTIONS_CATALOG
