import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HERO_MOTO_CORP_CATALOG = {
  source: 'heromotocorp',
  companyName: 'Hero MotoCorp',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.heromotocorp.com/en-in/company/careers/career-overview.html',
  companyDomain: 'heromotocorp.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'category-discovery+page-query',
  extractionStrategy:
    'official-careers-page+jobs2web-view-all-categories+html-category-rows+detail-pages+talentcommunity-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://jobs.heromotocorp.com/viewalljobs/',
  dryRunFile: 'heromotocorp/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    "Verified on July 16, 2026 that https://www.heromotocorp.com/en-in/company/careers/career-overview.html is Hero MotoCorp's official careers overview and that it hands applicants to the public first-party jobs board at https://jobs.heromotocorp.com/viewalljobs/, where category pages and job detail pages are server-rendered on jobs.heromotocorp.com.",
}

export default HERO_MOTO_CORP_CATALOG
