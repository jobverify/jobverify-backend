import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MOTIVITYLABS_CATALOG = {
  source: 'motivitylabs',
  companyName: 'MotivityLabs',
  officialBrandName: 'Motivity Labs',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'motivitylabs/jobs.json',
  companyCareerPage: 'https://motivitylabs.com/careers/',
  officialCareersPageUrl: 'https://motivitylabs.com/jobs/',
  companyDomain: 'motivitylabs.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'first-party-collection-page-jsonld',
  extractionStrategy: 'verified-first-party-collection-jsonld+same-domain-jobposting-details+india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified on October 3, 2026 that https://motivitylabs.com/careers/ links to the current first-party openings hub at https://motivitylabs.com/jobs/. The collection JSON-LD listed 30 public same-domain job details, including 20 with confirmed India geography and 10 without confirmed country. The scraper returns the confirmed India roles and flags incomplete source scope.',
}

export default MOTIVITYLABS_CATALOG
