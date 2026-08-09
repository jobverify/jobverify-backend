import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INFOCUSPINNOVATIONS_CATALOG = {
  source: 'infocuspinnovations',
  companyName: 'InfoCusp Innovations',
  officialBrandName: 'Infocusp',
  adapter: 'script',
  companyCareerPage: 'https://www.infocusp.com/careers/openings/',
  homepageUrl: 'https://www.infocusp.com/',
  companyDomain: 'infocusp.com',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'India',
  paginationStrategy: 'single-keka-active-jobs-endpoint',
  extractionStrategy: 'official-careers-page+careers-bundle+keka-embed-api+jobdetails',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://www.infocusp.com/careers/openings/ remained the live first-party InfoCusp Innovations openings page, that it exposed the Current Openings bundle under /_astro/, and that the bundle still referenced the public Keka portal at https://infocusp.keka.com/careers with identifier d8a117a8-6620-46fb-959e-742de38602e5. This scraper validates the official shell, parses the bundle config, and returns India jobs from the public Keka embed API.',
  dryRunFile: 'infocuspinnovations/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default INFOCUSPINNOVATIONS_CATALOG
