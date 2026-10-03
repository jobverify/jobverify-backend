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
    'verified-homepage-plus-careers-no-openings-message-plus-non-india-screenloop-board',
  extractionStrategy:
    'verified-homepage-careers-link+verified-careers-no-openings-message+verified-non-india-screenloop-board-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified https://amicable.io/, https://amicable.io/careers, and https://app.screenloop.com/careers/amicable on October 3, 2026. The homepage title now includes prenups. There is no trustworthy India jobs surface for the backlog company Amicable AI: the first-party careers page still says there are currently no open positions and asks speculative applicants to email jobs@amicable.co.uk, while the hidden Screenloop board lists seven non-India roles with Remote or London locations.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMICABLE_AI_CATALOG
