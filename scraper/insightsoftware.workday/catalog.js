import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INSIGHTSOFTWARE_CATALOG = {
  source: 'insightsoftware',
  companyName: 'insightsoftware',
  officialBrandName: 'insightsoftware',
  adapter: 'script',
  homepageUrl: 'https://insightsoftware.com/',
  companyCareerPage: 'https://insightsoftware.com/careers/',
  workdayTenantHost: 'https://magnitudesoftware.wd1.myworkdayjobs.com/',
  atsPlatform: 'workday',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-html-job-card-scan',
  extractionStrategy: 'verified-first-party-careers-page+india-workday-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'insightsoftware.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://insightsoftware.com/careers/ was the live first-party insightsoftware careers page, that it exposed Current Job Openings with India filters including India - Bangalore, India - Hyderabad, and India - Hyderabad - Remote, and that the same first-party page linked public Workday detail URLs on https://magnitudesoftware.wd1.myworkdayjobs.com/ for India roles including Customer Success Analyst, Director - Engineering, Manager, Engineering (Java Fullstack), and Senior Manager, Engineering.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'insightsoftware.workday/jobs.json',
}

export default INSIGHTSOFTWARE_CATALOG
