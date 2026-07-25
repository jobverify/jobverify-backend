import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const METACUBE_SOFTWARE_CATALOG = {
  source: 'metacubesoftware',
  companyName: 'Metacube Software',
  officialBrandName: 'Metacube',
  adapter: 'script',
  homepageUrl: 'https://www.metacube.com/',
  companyCareerPage: 'https://metacube.com/careers.php',
  atsPlatform: 'official-first-party-careers-shell-no-public-role-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-shell-validation',
  extractionStrategy:
    'verified-first-party-careers-shell-without-trustworthy-public-role-cards-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'metacube.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://metacube.com/careers.php is the live first-party Metacube careers shell and that it publicly shows generic copy such as "EXPERIENCED PROFESSIONALS", "STUDENTS & GRADUATES", and "Open Positions General Application" with no trustworthy public role cards, public requisitions, or dependable first-party apply targets for exact jobs. This provider therefore stays fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default METACUBE_SOFTWARE_CATALOG
