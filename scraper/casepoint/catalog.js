import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CASEPOINT_CATALOG = {
  source: 'casepoint',
  companyName: 'Casepoint',
  officialBrandName: 'Casepoint',
  adapter: 'script',
  homepageUrl: 'https://www.casepoint.com/',
  companyCareerPage: 'https://www.casepoint.com/careers/',
  jobsBoardUrl: 'https://casepoint.keka.com/careers/',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'India',
  paginationStrategy: 'single-keka-active-jobs-feed',
  extractionStrategy: 'verified-first-party-careers-page+india-roles-keka-handoff+active-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'casepoint.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.casepoint.com/careers/ remained the exact first-party Casepoint careers page, exposed View India Roles as a handoff to https://casepoint.keka.com/careers/, and that the public Keka feed listed openings including Performance Tester, Technical Support Engineer (Ediscovery), Business Analyst, and Software Engineer in Surat, India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default CASEPOINT_CATALOG
