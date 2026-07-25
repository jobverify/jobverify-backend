import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BGD_TECH_PVT_LTD_CATALOG = {
  source: 'bgdtechpvtltd',
  companyName: 'BGD Tech PVT LTD',
  officialBrandName: 'BGD - Tech private limited',
  adapter: 'script',
  homepageUrl: 'https://bgd-limited.com/',
  companyCareerPage: 'https://bgd-limited.com/careers',
  atsPlatform: 'official-company-site-resume-intake-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'verified-careers-intake-page-without-public-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'bgd-limited.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://bgd-limited.com/careers was the live first-party BGD careers intake page, that it asked candidates to contact hello@bgd-limited.com, and that it exposed no trustworthy public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default BGD_TECH_PVT_LTD_CATALOG
