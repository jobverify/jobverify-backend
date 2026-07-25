import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOLAR_INDUSTRIES_INDIA_CATALOG = {
  source: 'solarindustriesindia',
  companyName: 'Solar Industries India',
  officialBrandName: 'Solar Group',
  legalEntityName: 'Solar Industries India Limited',
  adapter: 'script',
  companyCareerPage: 'https://careers.solargroup.com/solargroup/',
  officialHomepageUrl: 'https://www.solargroup.com/',
  sampleJobViewUrl: 'https://careers.solargroup.com/solargroup/jobview/sr-executive-uav-2024122016373073',
  companyDomain: 'solargroup.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-careers-nav-plus-blocked-or-timeout-careers-board-validation',
  extractionStrategy:
    'verified-homepage-careers-handoff+verified-board-and-jobview-routes+verified-blocked-or-timeout-direct-fetches-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on July 17, 2026 that https://www.solargroup.com/ is the live Solar Group homepage for Solar Industries India and its Careers navigation points to https://careers.solargroup.com/solargroup/. Search-indexed first-party pages on the careers subdomain expose a Current Openings shell and jobview routes such as https://careers.solargroup.com/solargroup/jobview/sr-executive-uav-2024122016373073, but direct fetches to both the board root and sample jobview returned 403 Forbidden in browser-based checks and timed out during direct HTTP probes, so there is no trustworthy public jobs surface currently accessible for extraction.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SOLAR_INDUSTRIES_INDIA_CATALOG
