import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const OSI_DIGITAL_CATALOG = {
  source: 'osidigital',
  companyName: 'OSI Digital',
  officialBrandName: 'OSI Digital',
  adapter: 'script',
  companyCareerPage: 'https://osidigital.com/careers/',
  companyDomain: 'osidigital.com',
  atsPlatform: 'official-company-site-resume-form',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-resume-form',
  extractionStrategy: 'verified-first-party-careers-page+resume-form+linkedin-handoff+no-structured-openings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://osidigital.com/careers/ is the live first-party OSI Digital careers page, that its Current Opportunities section tells applicants to submit your resume below or use LinkedIn, and that it does not expose structured first-party openings to scrape directly.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'osidigital/jobs.json',
}

export default OSI_DIGITAL_CATALOG
