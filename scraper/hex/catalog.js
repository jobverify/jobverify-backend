import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HEX_CATALOG = {
  source: 'hex',
  companyName: 'Hex',
  officialBrandName: 'Hex',
  adapter: 'script',
  homepageUrl: 'https://hex.tech/',
  companyCareerPage: 'https://hex.tech/careers/',
  sampleRoleUrls: [
    'https://hex.tech/careers/software-engineer-backend-%28platform%29/',
    'https://hex.tech/careers/cloud-security-engineer/',
  ],
  atsPlatform: 'first-party-careers-page-us-only-openings',
  countryFilter: 'India',
  paginationStrategy: 'fail-closed-sentinel',
  extractionStrategy: 'verified-first-party-careers-page+verified-us-only-role-pages+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'hex.tech',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://hex.tech/careers/ is the live official Hex careers page, that it explicitly says "It\'s just Hex!" and "We\'re hiring in San Francisco, New York, and remote.", and that the first-party sample role pages Software Engineer, Backend (Platform) at https://hex.tech/careers/software-engineer-backend-%28platform%29/ and Cloud Security Engineer at https://hex.tech/careers/cloud-security-engineer/ publicly list US-only locations such as "NYC or Remote (US)" and "SF, NYC, or Remote (US)". Because no India-eligible openings were exposed on the verified first-party surface for the exact backlog company Hex, this provider stays fail-closed and returns an empty list until India hiring appears on the official site.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default HEX_CATALOG
