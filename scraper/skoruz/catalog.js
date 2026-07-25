import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SKORUZ_CATALOG = {
  source: 'skoruz',
  companyName: 'Skoruz',
  officialBrandName: 'Skoruz Technologies Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://www.skoruz.com/',
  companyCareerPage: 'https://www.skoruz.com/careers/',
  embeddedIndiaJobsUrl: 'https://talenthire.ceipal.in/Jobs/listing/MTAz',
  companyDomain: 'skoruz.com',
  atsPlatform: 'official-careers-page-with-untrusted-ceipal-embed',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page+india-ceipal-iframe-trust-failure-sentinel',
  extractionStrategy: 'verified-careers-page+us-empty-state+india-untrusted-iframe-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 against https://www.skoruz.com/careers/. The official Skoruz careers page embeds India openings via https://talenthire.ceipal.in/Jobs/listing/MTAz while the United States tab says "Currently, no openings available. Please check back later for updates. Thank you for your interest!" A clean client could not establish a trust relationship for the SSL/TLS secure channel and curl could not connect to the embedded India board, so there is no trustworthy public jobs surface to scrape.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default SKORUZ_CATALOG
