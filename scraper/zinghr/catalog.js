import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZINGHR_CATALOG = {
  source: 'zinghr',
  companyName: 'ZingHR',
  adapter: 'script',
  companyCareerPage: 'https://www.zinghr.com/jobs/',
  companyDomain: 'zinghr.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-page-role-index+detail-pages',
  extractionStrategy: 'verified-first-party-jobs-archive+detail-pages+first-party-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified on October 3, 2026 that https://www.zinghr.com/jobs/ is the live first-party ZingHR jobs archive with five openings: Customer Support- (HRMS/HCM), Sales Manager, Project Manager, Talent Acquisition Specialist, and API Developer. All five same-domain detail pages expose job category, job type, job location, and an on-page application form, with detail headings including Key Job Traits. The former /job-openings/ route redirects to a general careers page.',
  openingCount: 5,
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'zinghr/jobs.json',
}

export default ZINGHR_CATALOG
