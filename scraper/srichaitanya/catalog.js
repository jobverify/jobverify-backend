import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SRI_CHAITANYA_CATALOG = {
  source: 'srichaitanya',
  companyName: 'Sri Chaitanya',
  officialBrandName: 'Sri Chaitanya',
  adapter: 'script',
  homepageUrl: 'https://srichaitanya.net/',
  companyCareerPage: 'https://srichaitanya.net/careers/',
  companyDomain: 'srichaitanya.net',
  detailPageUrls: [
    'https://srichaitanya.net/career/sr-faculty-for-neet/',
    'https://srichaitanya.net/career/sr-faculty-for-iitjee/',
  ],
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-with-first-party-detail-pages',
  extractionStrategy: 'verified-first-party-careers-page+same-domain-detail-pages+inline-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://srichaitanya.net/careers/ is the live first-party Sri Chaitanya careers page and it exposes same-domain role detail pages at https://srichaitanya.net/career/sr-faculty-for-neet/ and https://srichaitanya.net/career/sr-faculty-for-iitjee/. Those detail pages publish role metadata including Date Posted, Location, Experience, Qualification, and an inline Apply For Job form on the same first-party surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SRI_CHAITANYA_CATALOG
