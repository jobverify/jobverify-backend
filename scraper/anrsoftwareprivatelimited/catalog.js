import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG = {
  source: 'anrsoftwareprivatelimited',
  companyName: 'ANR Software Private Limited',
  officialBrandName: 'ANR Software Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.anrsoftware.com/',
  companyCareerPage: 'https://www.anrsoftware.com/career/',
  atsPlatform: 'first-party-careers-page-contradictory-no-vacancy-markers',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-sentinel',
  extractionStrategy: 'verified-careers-page+contradictory-openings-and-no-vacancy-markers-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'anrsoftware.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.anrsoftware.com/career/ is the live first-party ANR Software careers page and exposes role cards, but the same public rows simultaneously advertise opening counts and the explicit empty-state message "No vacancy for this position now. Visit again!" across the page. Because the public first-party contract is contradictory and not trustworthy enough to enumerate open roles honestly, this provider fails closed and returns an empty list.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG
