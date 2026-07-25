import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HESTABIT_TECHNOLOGIES_CATALOG = {
  source: 'hestabittechnologies',
  companyName: 'Hestabit Technologies',
  officialBrandName: 'HestaBit',
  adapter: 'script',
  homepageUrl: 'https://www.hestabit.com/',
  companyCareerPage: 'https://www.hestabit.com/career',
  companyDomain: 'hestabit.com',
  atsPlatform: 'first-party-careers-page-third-party-google-forms-handoff',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-single-page',
  extractionStrategy: 'verified-first-party-role-teasers+verified-google-forms-handoff+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.hestabit.com/career is the live first-party HestaBit careers page and that it exposes role teasers such as Senior PHP Developer, Associate PHP Developer, and Senior Graphic Designer. Every visible apply action on that page hands applicants to docs.google.com Google Forms rather than a trustworthy first-party or trusted public jobs board, so this local provider intentionally fails closed and returns an empty array until Hestabit publishes a trustworthy public jobs surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default HESTABIT_TECHNOLOGIES_CATALOG
