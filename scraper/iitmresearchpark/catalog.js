import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IITM_RESEARCH_PARK_CATALOG = {
  source: 'iitmresearchpark',
  companyName: 'IITM Research Park',
  officialBrandName: 'IIT Madras Research Park',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://respark.iitm.ac.in/careers/',
  observedExpiredJobTitles: [
    'Electrical Engineer - Maintenance & Projects (3 Positions)',
    'Project Manager - Zoho Implementation',
    'Construction Manager - Civil',
    'Executive - Research Collaboration',
  ],
  observedExpiredClosingDates: [
    '2026-07-09',
    '2026-07-15',
    '2026-07-15',
    '2026-07-15',
  ],
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-expired-first-party-careers-page-snapshot',
  extractionStrategy: 'verified-first-party-careers-page+verified-expired-public-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'respark.iitm.ac.in',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://respark.iitm.ac.in/careers/ is the official IIT Madras Research Park careers page and still displays public job cards for Electrical Engineer - Maintenance & Projects (3 Positions), Project Manager - Zoho Implementation, Construction Manager - Civil, and Executive - Research Collaboration, but all visible cards were already past their own Valid till dates (July 09, 2026 and July 15, 2026) on the verified date. The provider therefore fails closed and returns an empty result until the first-party surface exposes fresh public listings.',
  dryRunFile: 'iitmresearchpark/jobs.json',
}

export default IITM_RESEARCH_PARK_CATALOG
