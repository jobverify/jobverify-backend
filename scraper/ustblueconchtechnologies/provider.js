import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const provider = {
  source: 'ustblueconchtechnologies',
  companyName: 'UST BlueConch Technologies',
  officialBrandName: 'UST BlueConch',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.ust.com/en/careers',
  blueconchReferenceUrl:
    'https://www.ust.com/en/who-we-are/ust-newsroom/ust-blueconch-wins-excellence-award-for-best-security-practices-in-it-ites-sector',
  companyDomain: 'ust.com',
  atsPlatform: 'generic-parent-company-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'blueconch-reference-plus-generic-parent-careers-validation',
  extractionStrategy:
    'verified-ust-blueconch-reference+verified-generic-ust-careers-page-without-blueconch-filter-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'ustblueconchtechnologies/jobs.json',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that UST still exposes UST BlueConch as a first-party branded business-unit reference on ust.com, while the live careers page at https://www.ust.com/en/careers is a generic UST careers page without a BlueConch-specific public jobs filter or dedicated BlueConch board. There is no BlueConch-specific public jobs surface that can be trusted today, so this local contract returns [] and fails closed if one appears later.',
}

export default provider
