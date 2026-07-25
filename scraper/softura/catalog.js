import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOFTURA_CATALOG = {
  source: 'softura',
  companyName: 'Softura',
  officialBrandName: 'Softura',
  adapter: 'script',
  homepageUrl: 'https://www.softura.com/',
  companyCareerPage: 'https://www.softura.com/careers/',
  companyDomain: 'softura.com',
  atsPlatform: 'official-company-careers-blocked',
  countryFilter: 'India',
  paginationStrategy: 'single-cloudflare-blocked-careers-route',
  extractionStrategy:
    'verified-first-party-careers-route+cloudflare-block-page+fail-closed-empty-result',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the first-party Softura careers route is https://www.softura.com/careers/. The public route currently serves a Cloudflare "Sorry, you have been blocked" page instead of a trustworthy jobs surface, so this local provider fails closed until Softura exposes a publicly fetchable first-party careers board again.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'softura/jobs.json',
}

export default SOFTURA_CATALOG
