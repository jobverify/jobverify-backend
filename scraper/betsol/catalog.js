import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BETSOL_CATALOG = {
  source: 'betsol',
  companyName: 'Betsol',
  officialBrandName: 'BETSOL',
  adapter: 'script',
  homepageUrl: 'https://www.betsol.com/',
  companyCareerPage: 'https://www.betsol.com/careers/',
  boardUrl: 'https://careers.smartrecruiters.com/Betsol',
  companyDomain: 'betsol.com',
  atsPlatform: 'smartrecruiters-board-html',
  countryFilter: 'India',
  paginationStrategy: 'exact-name-smartrecruiters-board-grouped-by-location',
  extractionStrategy:
    'verified-first-party-careers-linkout+exact-name-smartrecruiters-board-html+india-location-group-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-01',
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that the first-party BETSOL careers page at https://www.betsol.com/careers/ still publicly directs applicants to the exact-name SmartRecruiters board at https://careers.smartrecruiters.com/Betsol. Direct fetches to the first-party page still returned a Cloudflare challenge in this environment, but the linked public board remained reachable under the refreshed Careers at BETSOL shell and visibly listed 21 public openings, including 15 India roles under Bengaluru, India such as Technical Team Leader - DevOps & DevSecOps, Compliance Lead (GRC), and Associate Database Administrator. This local provider scrapes the verified exact-name board and keeps only India roles.',
  dryRunFile: 'betsol/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BETSOL_CATALOG
