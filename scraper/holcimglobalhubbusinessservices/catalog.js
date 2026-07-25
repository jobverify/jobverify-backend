import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG = {
  source: 'holcimglobalhubbusinessservices',
  companyName: 'Holcim Global Hub Business Services',
  adapter: 'script',
  companyCareerPage: 'https://careers.holcimgroup.com/holcim_ghbs/go/Job-at-Holcim-GHBS/8823002/',
  companyDomain: 'careers.holcimgroup.com',
  jobsCategoryUrl: 'https://careers.holcimgroup.com/holcim_ghbs/go/Job-at-Holcim-GHBS/8823002/',
  sampleJobUrl: 'https://careers.holcimgroup.com/holcim_ghbs/job/Navi-Mumbai-Talent-Acquisition-Specialist-MH-400708/1361698557/',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'single-successfactors-category-page-plus-detail-pages',
  extractionStrategy: 'verified-ghbs-jobs-category-page+successfactors-detail-pages+navi-mumbai-role-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.holcimgroup.com/holcim_ghbs/go/Job-at-Holcim-GHBS/8823002/ remained the first-party Global Hub Business Services jobs category page, that it showed 13 Jobs in Navi Mumbai on the verified date, and that first-party detail pages were publicly reachable for roles including Talent Acquisition Specialist and Assistant Manager - Analytics, Qlik Developer (GHAR).',
  modulePath: path.join(currentDir, 'script.js'),
}

export default HOLCIM_GLOBAL_HUB_BUSINESS_SERVICES_CATALOG
