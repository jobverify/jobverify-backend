import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GOIBIBO_CATALOG = {
  source: 'goibibo',
  companyName: 'Goibibo',
  companyCareerPage: 'https://www.goibibo.com/careers/',
  companyDomain: 'goibibo.com',
  adapter: 'script',
  atsPlatform: 'official-company-careers-unavailable',
  countryFilter: 'India',
  paginationStrategy: 'homepage-careers-link-validation',
  extractionStrategy: 'verified-homepage+broken-careers-handoff-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  modulePath: path.join(currentDir, 'script.js'),
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that the official Goibibo homepage still links job seekers to https://www.goibibo.com/careers/, but that first-party route currently serves an unavailable careers surface (observed as a broken 404/503-style handoff) and exposes no trustworthy public job listings.',
  homepageUrl: 'https://www.goibibo.com/',
  acceptedCareerPageStatuses: [404, 503],
}

export default GOIBIBO_CATALOG
