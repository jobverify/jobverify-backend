import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://desteksolutions.com/ is the live Destek Infosolutions homepage, https://desteksolutions.com/contact is the live first-party contact page, and the direct first-party route https://desteksolutions.com/careers did not expose a trustworthy public jobs surface. No trustworthy public jobs surface is currently exposed.'

export const DESTEK_INFOSOLUTIONS_CATALOG = {
  source: 'destekinfosolutions',
  companyName: 'Destek Infosolutions',
  officialBrandName: 'Destek Infosolutions',
  adapter: 'script',
  homepageUrl: 'https://desteksolutions.com/',
  companyCareerPage: 'https://desteksolutions.com/careers',
  contactPageUrl: 'https://desteksolutions.com/contact',
  companyDomain: 'desteksolutions.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-plus-common-careers-route-validation',
  extractionStrategy: 'verified-homepage+verified-contact-page+verified-missing-careers-route-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'destekinfosolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DESTEK_INFOSOLUTIONS_CATALOG
