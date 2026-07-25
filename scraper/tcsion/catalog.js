import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TCS_ION_CATALOG = {
  source: 'tcsion',
  companyName: 'TCS iON',
  officialBrandName: 'TCS iON',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'tcsion/jobs.json',
  officialHomepageUrl: 'https://www.tcsion.com/',
  companyCareerPage: 'https://www.tcsion.com/jobs/',
  sampleMarketplaceListingUrl: 'https://www.tcsion.com/job-openings/jobs-in-hyderabad',
  companyDomain: 'tcsion.com',
  atsPlatform: 'first-party-jobs-marketplace-no-exact-name-employer-surface',
  countryFilter: 'India',
  paginationStrategy: 'verified-jobs-marketplace-home-without-exact-name-tcsion-listings',
  extractionStrategy:
    'verified-first-party-marketplace+generic-multi-company-hiring-surface-without-exact-name-tcsion-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.tcsion.com/jobs/ is the live first-party TCS iON jobs marketplace page titled "TCS iON Jobs: Explore opportunities and give your career a boost", that it describes opportunities from leading companies, and that it features unrelated employers such as Nest Digital, TATA ELXSI, and Publicis sapient rather than an exact-name TCS iON employer feed. Verified on Friday, July 17, 2026 that the first-party listing route https://www.tcsion.com/job-openings/jobs-in-hyderabad also exposes unrelated employers on the same marketplace surface. There is no trustworthy exact-name TCS iON employer jobs surface on these first-party pages as of July 17, 2026, so this provider intentionally fails closed and returns an empty array until TCS iON publishes a trustworthy exact-name public jobs feed.',
}

export default TCS_ION_CATALOG
