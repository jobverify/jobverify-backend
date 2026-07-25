import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.schoolnetindia.com/careers/ is the live first-party Schoolnet India careers page showing public openings including Senior Full Stack Developer, and that https://hms.schoolnetindia.com/login is the official Schoolnet India HMS recruitment portal showing Browse Jobs plus a visible Computer Training Facilitator (ICT Educator) opening under the Schoolnet India Ltd. brand.'

export const SCHOOLNET_INDIA_CATALOG = {
  source: 'schoolnetindia',
  companyName: 'Schoolnet India',
  officialBrandName: 'Schoolnet India Ltd.',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'schoolnetindia/jobs.json',
  homepageUrl: 'https://www.schoolnetindia.com/',
  companyCareerPage: 'https://www.schoolnetindia.com/careers/',
  recruitmentPortalUrl: 'https://hms.schoolnetindia.com/login',
  companyDomain: 'schoolnetindia.com',
  atsPlatform: 'official-company-site-public-careers-page',
  countryFilter: 'India',
  paginationStrategy:
    'single-official-careers-page-no-pagination-plus-official-recruitment-portal-verification',
  extractionStrategy:
    'verified-official-careers-page+verified-official-recruitment-portal+role-card-text-extraction',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedSampleRoleTitle: 'Senior Full Stack Developer',
  verifiedRecruitmentPortalRoleTitle: 'Computer Training Facilitator (ICT Educator)',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default SCHOOLNET_INDIA_CATALOG
