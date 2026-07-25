import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LOTUS_WIRELESS_TECHNOLOGIES_CATALOG = {
  source: 'lotuswirelesstechnologies',
  companyName: 'Lotus Wireless Technologies',
  officialBrandName: 'Lotus Wireless Technologies India Pvt. Ltd.',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.lotuswireless.com/careers.html',
  companyDomain: 'lotuswireless.com',
  atsPlatform: 'official-careers-page-apply-email-sentinel',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-apply-email-sentinel',
  extractionStrategy: 'verified-first-party-careers-page+apply-at-email-copy+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.lotuswireless.com/careers.html is Lotus Wireless Technologies\' live first-party careers page and that it currently instructs candidates to "Apply at hr@lotuswireless.com" without publishing trustworthy public job cards. The local scraper therefore fails closed and returns no jobs until Lotus Wireless exposes a stable public listings inventory.',
}

export default LOTUS_WIRELESS_TECHNOLOGIES_CATALOG
