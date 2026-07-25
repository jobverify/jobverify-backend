import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LEAP_FINANCE_CATALOG = {
  source: 'leapfinance',
  companyName: 'Leap Finance',
  officialBrandName: 'Leap Finance',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'leapfinance/jobs.json',
  homepageUrl: 'https://leapfinance.com/',
  companyCareerPage: 'https://careers.leapfinance.com/',
  publicJobsApiUrl: 'https://careers-api-eight.vercel.app/api/jobs',
  companyDomain: 'leapfinance.com',
  verifiedPublicJobCount: 7,
  atsPlatform: 'official-company-careers-json-api',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-live-jobs-api',
  extractionStrategy: 'verified-first-party-careers-page+embedded-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://leapfinance.com/ is the live exact-name first-party Leap Finance homepage, that the public careers surface is hosted at https://careers.leapfinance.com/, and that the careers page embeds the live jobs API at https://careers-api-eight.vercel.app/api/jobs. Live verification on Thursday, July 16, 2026 confirmed 7 live jobs in the public payload, including India listings with TurboHire public apply URLs.',
}

export default LEAP_FINANCE_CATALOG
