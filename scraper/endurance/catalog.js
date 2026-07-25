import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ENDURANCE_CATALOG = {
  source: 'endurance',
  companyName: 'Endurance',
  officialBrandName: 'Endurance Technologies Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  officialHomepageUrl: 'https://www.endurancegroup.com/',
  officialCareersLandingUrl: 'https://www.endurancegroup.com/careers/',
  companyCareerPage: 'https://www.endurancegroup.com/careers/job-portal/',
  officialJobDetailExampleUrl: 'https://www.endurancegroup.com/career/technical-architect/',
  atsPlatform: 'first-party-careers-page-and-job-portal',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-job-portal-html',
  extractionStrategy:
    'verified-first-party-homepage+careers-page+job-portal+job-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'endurancegroup.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.endurancegroup.com/ is the live Endurance Technologies homepage, that https://www.endurancegroup.com/careers/ is the first-party careers page, and that the current first-party public jobs surface is the job portal at https://www.endurancegroup.com/careers/job-portal/ with detail pages such as https://www.endurancegroup.com/career/technical-architect/. Verified current first-party openings including Technical Architect and Technical Lead - Hardware. The apply flow is handled on the first-party detail pages via the embedded Apply Now resume form rather than an external ATS, and the verified first-party homepage remains https://www.endurancegroup.com/',
  dryRunFile: 'endurance/jobs.json',
}

export default ENDURANCE_CATALOG
