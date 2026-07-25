import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DIGITAL_WEB_SOLUTIONS_CATALOG = {
  source: 'digitalwebsolutions',
  companyName: 'Digital Web Solutions',
  officialBrandName: 'Digital Web Solutions',
  adapter: 'script',
  homepageUrl: 'https://www.digitalwebsolutions.com/',
  companyCareerPage: 'https://www.digitalwebsolutions.com/careers/',
  officialJobsBoardUrl: 'https://hirenext.io/co/digital-web-solutions/',
  companyDomain: 'digitalwebsolutions.com',
  atsPlatform: 'hirenext',
  countryFilter: 'Global',
  paginationStrategy: 'single-hirenext-company-board',
  extractionStrategy: 'verified-first-party-careers-page+official-hirenext-board+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 19,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.digitalwebsolutions.com/careers/ remained the first-party Digital Web Solutions careers page and that its View All Jobs CTA linked to the official public Hirenext board at https://hirenext.io/co/digital-web-solutions/. The verified board exposed 19 public roles including Trainee Recruitment Specialist in Gurgaon, AI & Content Associate in Noida, Uttar Pradesh, India, and Senior Executive - PPC in Noida on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default DIGITAL_WEB_SOLUTIONS_CATALOG
