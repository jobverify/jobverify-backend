import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IXIGO_CATALOG = {
  source: 'ixigo',
  companyName: 'ixigo',
  officialBrandName: 'ixigo',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.ixigo.com/',
  companyCareerPage: 'https://careers.ixigo.com/',
  legacyCareersUrl: 'https://www.ixigo.com/about/careers/',
  currentCareersUrl: 'https://careers.ixigo.com/',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-legacy-careers-redirect-plus-no-public-jobs-sentinel',
  extractionStrategy:
    'verified-legacy-careers-redirect+verified-current-careers-no-jobs-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'ixigo.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.ixigo.com/about/careers/ redirects to the current first-party careers surface at https://careers.ixigo.com/, that the current careers page shows the public no-openings state with the exact marker "No Jobs Found", and that a legacy first-party detail page such as https://www.ixigo.com/about/careers/research-engineer/ still resolves but hands off to an old Recruiterflow apply route that returned HTTP 404 during verification. There is no trustworthy current public jobs surface for ixigo on the verified date.',
  dryRunFile: 'ixigo/jobs.json',
}

export default IXIGO_CATALOG
