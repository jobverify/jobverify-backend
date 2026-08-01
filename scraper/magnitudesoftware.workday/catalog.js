import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAGNITUDE_SOFTWARE_CATALOG = {
  source: 'magnitudesoftware',
  companyName: 'Magnitude Software',
  officialBrandName: 'Magnitude Software',
  adapter: 'script',
  homepageUrl: 'https://www.magnitude.com/',
  companyCareerPage: 'https://insightsoftware.com/careers/',
  redirectCompanyUrl: 'https://insightsoftware.com/magnitude/',
  parentCompanyName: 'insightsoftware',
  workdayTenantHost: 'https://magnitudesoftware.wd1.myworkdayjobs.com/',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-html-job-card-scan',
  extractionStrategy:
    'verified-magnitude-homepage-redirect+verified-first-party-careers-page+india-workday-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'magnitude.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.magnitude.com/ resolved to https://insightsoftware.com/magnitude/, that the redirected first-party page stated Magnitude is now part of insightsoftware and linked Careers to https://insightsoftware.com/careers/, and that the first-party careers page exposed Current Job Openings with India filters and public Workday detail links on https://magnitudesoftware.wd1.myworkdayjobs.com/, including Customer Success Analyst and Director - Engineering.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'magnitudesoftware.workday/jobs.json',
}

export default MAGNITUDE_SOFTWARE_CATALOG
