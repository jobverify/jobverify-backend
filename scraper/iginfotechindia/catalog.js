import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IG_INFOTECH_INDIA_CATALOG = {
  source: 'iginfotechindia',
  companyName: 'IG Infotech India',
  officialBrandName: 'IG Infotech India',
  adapter: 'script',
  homepageUrl: 'https://www.iggroup.com/',
  companyCareerPage: 'https://www.iggroup.com/about-us/careers',
  companyContactPageUrl: 'https://www.iggroup.com/contact-page',
  workdayListingUrl: 'https://ig.wd103.myworkdayjobs.com/EXT_IG',
  workdayTenantHost: 'https://ig.wd103.myworkdayjobs.com/',
  parentCompanyName: 'IG Group',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-link-to-workday-listing',
  extractionStrategy:
    'verified-ig-careers-page+verified-bengaluru-entity-page+india-workday-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'iggroup.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.iggroup.com/about-us/careers was the live first-party IG Group careers page and linked Find a role you love to https://ig.wd103.myworkdayjobs.com/EXT_IG, that https://www.iggroup.com/contact-page identified the Bengaluru office as IG Infotech India Private Limited, and that the linked Workday surface exposed live Bangalore, India roles including Head Of Workforce Management, Content Producer, Web & SEO Copywriter, and other public India openings.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'iginfotechindia/jobs.json',
}

export default IG_INFOTECH_INDIA_CATALOG
