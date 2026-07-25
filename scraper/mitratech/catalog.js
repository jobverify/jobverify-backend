import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MITRATECH_CATALOG = {
  source: 'mitratech',
  companyName: 'Mitratech',
  officialBrandName: 'Mitratech',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://mitratech.com/',
  companyCareerPage: 'https://mitratech.com/about-us/careers/',
  atsPlatform: 'official-careers-route-blocked-by-cloudflare',
  countryFilter: 'India',
  paginationStrategy: 'direct-careers-route-validation-return-empty-when-blocked',
  extractionStrategy: 'verified-careers-route+cloudflare-interstitial+no-trustworthy-direct-public-jobs-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'mitratech.com',
  dryRunFile: 'mitratech/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://mitratech.com/about-us/careers/ remained Mitratech\'s official careers route, but direct unauthenticated fetches from the scraper environment returned a Cloudflare "Attention Required!" interstitial with "Sorry, you have been blocked" instead of a trustworthy first-party jobs surface.',
}

export default MITRATECH_CATALOG
