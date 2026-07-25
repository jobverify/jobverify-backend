import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const PRAMATA_KNOWLEDGE_SOLUTIONS_CATALOG = {
  source: 'pramataknowledgesolutions',
  companyName: 'Pramata Knowledge Solutions',
  officialBrandName: 'Pramata',
  adapter: 'script',
  companyCareerPage: 'https://www.pramata.com/careers/',
  sampleRoleUrl: 'https://www.pramata.com/careers/legal-solution-consultant/',
  contactEmail: 'hr-usa@pramata.com',
  atsPlatform: 'first-party-careers-page-bot-gated',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy: 'verified-cloudflare-challenge-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'pramata.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official careers surface for the backlog company Pramata Knowledge Solutions was https://www.pramata.com/careers/, that direct fetches of both the careers landing page and the sample role route https://www.pramata.com/careers/legal-solution-consultant/ returned a Cloudflare bot challenge instead of scraper-visible listings, and that public first-party role evidence still referenced hr-usa@pramata.com. This local provider is intentionally fail-closed and returns an honest empty list until the official surface becomes scraper-accessible.',
  dryRunFile: 'pramataknowledgesolutions/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default PRAMATA_KNOWLEDGE_SOLUTIONS_CATALOG
