import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BRAINIUM_INFORMATION_TECHNOLOGIES_CATALOG = {
  source: 'brainiuminformationtechnologies',
  companyName: 'Brainium Information Technologies',
  officialBrandName: 'Brainium Information Technologies Pvt Ltd',
  adapter: 'script',
  companyCareerPage: 'https://www.brainiuminfotech.com/careers',
  officialCareersPageUrl: 'https://www.brainiuminfotech.com/careers',
  companyDomain: 'brainiuminfotech.com',
  atsPlatform: 'first-party-html-open-roles',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy: 'verified-first-party-careers-page+html-open-roles',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.brainiuminfotech.com/careers is the live first-party Brainium Information Technologies careers page and that it exposes an Open Positions section with visible role cards for India-based hiring in Kolkata.',
  dryRunFile: 'brainiuminformationtechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BRAINIUM_INFORMATION_TECHNOLOGIES_CATALOG
