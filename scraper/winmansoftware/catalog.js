import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const WINMAN_SOFTWARE_CATALOG = {
  source: 'winmansoftware',
  companyName: 'Winman Software',
  officialBrandName: 'Winman Software',
  adapter: 'script',
  homepageUrl: 'https://www.winmansoftware.com/',
  companyCareerPage: 'https://www.winmansoftware.com/careers/experienced/',
  applyUrl: 'https://winman.in/jobs/resumedetail.aspx',
  atsPlatform: 'official-first-party-html-table',
  countryFilter: 'India',
  paginationStrategy: 'single-page',
  extractionStrategy: 'html-table',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'winmansoftware.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.winmansoftware.com/careers/experienced/ was the live first-party Winman Software experienced-candidates careers page, that it exposed a public HTML table with current openings including Senior Accountant and Electrical Maintenance Supervisor, and that the page handed applicants to the first-party application route https://winman.in/jobs/resumedetail.aspx.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default WINMAN_SOFTWARE_CATALOG
