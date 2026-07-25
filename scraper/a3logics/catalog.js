import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const A3LOGICS_CATALOG = {
  source: 'a3logics',
  companyName: 'A3logics',
  officialBrandName: 'A3Logics',
  adapter: 'script',
  homepageUrl: 'https://www.a3logics.com/',
  companyCareerPage: 'https://www.a3logics.com/careers/',
  jobsBoardUrl: 'https://a3logics.keka.com/careers/',
  atsPlatform: 'keka-embed-api',
  countryFilter: 'India',
  paginationStrategy: 'single-keka-active-jobs-feed',
  extractionStrategy: 'verified-first-party-careers-page+keka-embed-handoff+active-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'a3logics.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.a3logics.com/careers/ remained the exact first-party A3Logics careers page, exposed an Explore Job opportunities handoff to https://a3logics.keka.com/careers/, and that the public Keka feed listed openings including Data Administrator, Senior System Administrator, and Admin Executive in Jaipur, India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default A3LOGICS_CATALOG
