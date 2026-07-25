import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VIRINCHI_TECHNOLOGIES_CATALOG = {
  source: 'virinchitechnologies',
  companyName: 'Virinchi Technologies',
  officialBrandName: 'Virinchi',
  adapter: 'script',
  homepageUrl: 'https://www.virinchi.com/',
  companyCareerPage: 'https://www.virinchi.com/careers.php',
  profileSignupUrl: 'http://www.virinchigroup.com/ksoft/profSignup.php',
  resumeEmail: 'virinchi2015@gmail.com',
  atsPlatform: 'first-party-careers-page-profile-signup-only',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-sentinel',
  extractionStrategy: 'verified-careers-page+profile-signup-link+resume-email-no-public-role-list',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'virinchi.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.virinchi.com/careers.php is the live first-party Virinchi careers page, but it exposes only a Profile Sign Up handoff and the resume email virinchi2015@gmail.com instead of a trustworthy public list of open roles. This provider therefore fails closed and returns no jobs until a real first-party openings surface appears.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VIRINCHI_TECHNOLOGIES_CATALOG
