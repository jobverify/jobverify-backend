import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ALLYIS_INDIA_CATALOG = {
  source: 'allyisindia',
  companyName: 'Allyis India',
  officialBrandName: 'Tech Mahindra Allyis',
  adapter: 'script',
  homepageUrl: 'https://www.allyis.com/ind/careers',
  companyCareerPage: 'https://www.allyis.com/ind/careers',
  embeddedJobsUrl: 'https://staffing.allyisapps.com/home/listjobs/114025',
  atsPlatform: 'official-careers-page-plus-blocked-embedded-jobs-host',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-blocked-iframe-validation',
  extractionStrategy: 'verified-first-party-careers-page+blocked-embedded-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'allyis.com',
  verifiedOn: '2026-08-01',
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that https://www.allyis.com/ind/careers is still the live first-party Allyis India careers page, that it visibly presents "Jobs at Allyis, India" for TechM Allyis, and that it still embeds the public jobs handoff iframe https://staffing.allyisapps.com/home/listjobs/114025. During live verification from this environment, the embedded staffing host timed out and remained unreachable, so the trustworthy public jobs surface is currently blocked and this provider stays fail-closed until a stable parser can be promoted.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ALLYIS_INDIA_CATALOG
