import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NOVIGO_SOLUTIONS_CATALOG = {
  source: 'novigosolutions',
  companyName: 'Novigo Solutions',
  officialBrandName: 'Novigo Solutions',
  adapter: 'script',
  homepageUrl: 'https://www.novigosolutions.com/',
  companyCareerPage: 'https://www.novigosolutions.com/careers-life-at-novigo',
  companyDomain: 'novigosolutions.com',
  atsPlatform: 'first-party-careers-page-inline-role-list',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy:
    'verified-first-party-careers-page+visible-inline-role-sections+same-page-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.novigosolutions.com/careers-life-at-novigo is the exact-name Novigo Solutions first-party careers page, that it publicly renders visible inline role sections such as ".Net Developer (2-5 Years)," "Angular Developer (3-6 Years)," and "Python Developer (3-6 Years)," that the shared visible location text is "Bangalore / Mangalore / Remote work during Pandemic.," and that each role is paired with the shared "Apply Online" same-page resume form. The trusted public inventory is therefore scraped directly from the first-party page.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'novigosolutions/jobs.json',
}

export default NOVIGO_SOLUTIONS_CATALOG
