import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZINGHR_CATALOG = {
  source: 'zinghr',
  companyName: 'ZingHR',
  adapter: 'script',
  companyCareerPage: 'https://www.zinghr.com/job-openings/',
  companyDomain: 'zinghr.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page-role-index+detail-pages',
  extractionStrategy: 'verified-first-party-job-openings-page+detail-pages+first-party-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.zinghr.com/job-openings/ was the live first-party ZingHR jobs page, that it publicly listed five openings including Customer Support- (HRMS/HCM), Sales Manager, Project Manager, Talent Acquisition Specialist, and API Developer, and that the linked first-party detail pages under https://www.zinghr.com/jobs/ exposed job category, job type, job location, and an on-page application form.',
  openingCount: 5,
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'zinghr/jobs.json',
}

export default ZINGHR_CATALOG
