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
  verifiedOn: '2026-07-28',
  verifiedSurfaceSummary:
    'Verified https://amicable.io/, https://amicable.io/careers, and https://app.screenloop.com/careers/amicable on July 28, 2026. There is no trustworthy India jobs surface for the backlog company Amicable AI: the first-party amicable.io homepage links to a branded careers page that explicitly says there are currently no open positions and asks speculative applicants to email jobs@amicable.co.uk, while the hidden Screenloop board exposes only non-India roles such as Remote or London rather than India openings.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AMICABLE_AI_CATALOG
