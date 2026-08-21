import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BRAINIUM_INFORMATION_TECHNOLOGIES_CATALOG = {
  source: 'brainiuminformationtechnologies',
  companyName: 'Brainium Information Technologies',
  officialBrandName: 'Brainium Information Technologies Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://www.brainiuminfotech.com/',
  companyCareerPage: 'https://www.brainiuminfotech.com/careers',
  officialCareersPageUrl: 'https://www.brainiuminfotech.com/careers',
  companyDomain: 'brainiuminfotech.com',
  atsPlatform: 'first-party-html-open-roles',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page-or-verified-cloudflare-blocked-empty',
  extractionStrategy: 'verified-first-party-careers-page+html-open-roles-or-verified-cloudflare-blocked-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-14',
  verifiedSurfaceSummary:
    'Verified on Friday, August 14, 2026 that both https://www.brainiuminfotech.com/ and https://www.brainiuminfotech.com/careers return the same Cloudflare-backed HTTP 403 page titled "Attention Required! | Cloudflare" from this environment. The previously verified July 18, 2026 Open Positions surface is not fetchable here today, so the scraper returns [] only while those first-party routes remain on that exact blocked shell.',
  dryRunFile: 'brainiuminformationtechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BRAINIUM_INFORMATION_TECHNOLOGIES_CATALOG
