import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GODREJ_CONSUMER_PRODUCTS_CATALOG = {
  source: 'godrejconsumerproducts',
  companyName: 'Godrej Consumer Products',
  adapter: 'script',
  companyCareerPage: 'https://www.godrejcp.com/careers',
  officialCareersPageUrl: 'https://www.godrejcp.com/careers',
  officialJoinUsUrl: 'https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl-',
  verifiedSampleJobUrl:
    'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI?utm_source=linkedin&utm_medium=phenom-feeds',
  verifiedSampleSecondaryJobUrl:
    'https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics?utm_source=linkedin&utm_medium=phenom-feeds',
  officialBrandName: 'Godrej Consumer Products',
  legalEntityName: 'Godrej Consumer Products Limited',
  atsPlatform: 'first-party-careers-page+phenom-apply-links',
  paginationStrategy: 'single-verified-careers-listing-page',
  extractionStrategy:
    'verified-first-party-careers-page+public-job-cards+official-phenom-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'godrejcp.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.godrejcp.com/careers was the live first-party Godrej Consumer Products careers page, exposing public job cards for Godrej Consumer Products Limited roles such as Research Scientist HI and Manager - Analytics. That verified careers page linked candidates through Join us and Apply actions to the official host at https://careers.godrejindustries.com/in/en/godrej-consumer-products-limited-gcpl- and to public role detail URLs including https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0204147ENIN/Research-Scientist-HI?utm_source=linkedin&utm_medium=phenom-feeds and https://careers.godrejindustries.com/in/en/job/GGXGGZINPPOS0211532ENIN/Manager-Analytics?utm_source=linkedin&utm_medium=phenom-feeds.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default GODREJ_CONSUMER_PRODUCTS_CATALOG
