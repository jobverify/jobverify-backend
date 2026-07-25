import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AMICABLE_AI_CATALOG = {
  source: 'amicableai',
  companyName: 'Amicable AI',
  officialBrandName: 'amicable',
  adapter: 'script',
  companyCareerPage: 'https://amicable.io/careers',
  companyDomain: 'amicable.io',
  officialHomepageUrl: 'https://amicable.io/',
  officialScreenloopBoardUrl: 'https://app.screenloop.com/careers/amicable',
  officialSpeculativeApplyEmail: 'jobs@amicable.co.uk',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-homepage-plus-careers-no-openings-message-plus-stale-screenloop-board',
  extractionStrategy:
    'verified-homepage-careers-link+verified-careers-no-openings-message+verified-stale-screenloop-board-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified https://amicable.io/, https://amicable.io/careers, and https://app.screenloop.com/careers/amicable on July 15, 2026. There is no trustworthy public jobs surface for the backlog company Amicable AI: the first-party amicable.io homepage links to a branded careers page that explicitly says there are currently no open positions and asks speculative applicants to email jobs@amicable.co.uk, while the hidden Screenloop iframe still exposes stale United Kingdom roles rather than a trustworthy current openings board.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMICABLE_AI_CATALOG
