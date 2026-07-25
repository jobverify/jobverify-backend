import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PRATIAN_TECHNOLOGIES_CATALOG = {
  source: 'pratiantechnologies',
  companyName: 'Pratian Technologies',
  officialBrandName: 'Pratian',
  adapter: 'script',
  homepageUrl: 'https://www.pratian.com/',
  companyCareerPage: 'https://www.pratian.com/career',
  companyDomain: 'pratian.com',
  atsPlatform: 'first-party-careers-shell-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'angular-shell-plus-bundle-check',
  extractionStrategy: 'verified-first-party-angular-shell+verified-career-bundle-without-public-job-listings+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.pratian.com/career serves a live first-party Angular careers shell and loads the current bundle main.d7ac0e33a2b8f83f.js. The verified bundle includes careers messaging such as "At Pratian, it is all about you." together with nurture, challenge, celebrate, and trust copy, but the verified surface exposed no trustworthy public jobs surface, public role rows, or stable anonymous job detail links.',
  dryRunFile: 'pratiantechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PRATIAN_TECHNOLOGIES_CATALOG
