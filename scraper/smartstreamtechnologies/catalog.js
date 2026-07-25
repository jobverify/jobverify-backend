import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SMARTSTREAM_TECHNOLOGIES_CATALOG = {
  source: 'smartstreamtechnologies',
  companyName: 'SmartStream Technologies',
  officialBrandName: 'Smartstream',
  adapter: 'script',
  homepageUrl: 'https://smart.stream/',
  companyCareerPage: 'https://smart.stream/careers/',
  atsPlatform: 'official-company-careers-no-public-jobs-catalog',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+email-only-interest-flow+no-public-job-catalog',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'smart.stream',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://smart.stream/careers/ is the exact Smartstream careers page, that it asks candidates to send CVs to careers@smart.stream, and that the page shows Apply Online and View All Roles copy but no enumerable public jobs catalog or trustworthy first-party listings feed.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SMARTSTREAM_TECHNOLOGIES_CATALOG
