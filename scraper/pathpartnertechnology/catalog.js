import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PATHPARTNER_TECHNOLOGY_CATALOG = {
  source: 'pathpartnertechnology',
  companyName: 'PathPartner Technology',
  officialBrandName: 'PathPartner Technology',
  adapter: 'script',
  homepageUrl: 'https://www.pathpartnertech.com/',
  companyCareerPage: 'https://www.pathpartnertech.com/career/',
  companyDomain: 'pathpartnertech.com',
  atsPlatform: 'official-company-careers-blocked',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-route-blocked-public-fetch',
  extractionStrategy:
    'verified-first-party-careers-route+repeatable-connection-reset+fail-closed-empty-result',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the first-party PathPartner careers route is https://www.pathpartnertech.com/career/. Repeated direct public fetches from this worker to that exact first-party URL failed with a connection-reset / TLS-channel error before any trustworthy public jobs markup could be retrieved, so the public surface is currently blocked for scraper verification and this local provider fails closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'pathpartnertechnology/jobs.json',
}

export default PATHPARTNER_TECHNOLOGY_CATALOG
