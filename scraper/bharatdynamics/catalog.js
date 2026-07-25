import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.bdl-india.in/ is the live official Bharat Dynamics Limited homepage and that its HR menu links the first-party recruitment table at https://www.bdl-india.in/recruitments. The recruitment page is a live public first-party surface with a Bharat Dynamics-hosted notices table, the archive continuation at https://www.bdl-india.in/recruitments?page=1, and an outbound National Career Service link at https://www.ncs.gov.in/. During live checks, the visible first two pages exposed selection lists, addenda, interview schedules, and older walk-in/archive notices rather than a clearly open application notice, so the scraper keeps a conservative actionable-notice filter and currently returns zero clearly open application notices on the verified July 15, 2026 surface.'

export const BHARAT_DYNAMICS_CATALOG = {
  source: 'bharatdynamics',
  companyName: 'Bharat Dynamics',
  officialBrandName: 'Bharat Dynamics Limited (BDL)',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'bharatdynamics/jobs.json',
  homepageUrl: 'https://www.bdl-india.in/',
  companyCareerPage: 'https://www.bdl-india.in/recruitments',
  pageTwoUrl: 'https://www.bdl-india.in/recruitments?page=1',
  externalVacancyPortalUrl: 'https://www.ncs.gov.in/',
  companyDomain: 'bdl-india.in',
  atsPlatform: 'official-recruitment-table',
  countryFilter: 'India',
  paginationStrategy: 'official-recruitments-root-plus-page-query',
  extractionStrategy:
    'verified-homepage-recruitment-handoff+paginated-official-recruitment-table+conservative-actionable-notice-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default BHARAT_DYNAMICS_CATALOG
