import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INSTASAFE_CATALOG = {
  source: 'instasafe',
  companyName: 'InstaSafe',
  officialBrandName: 'InstaSafe',
  adapter: 'script',
  companyCareerPage: 'https://instasafe.com/careers/',
  homepageUrl: 'https://instasafe.com/',
  careersPageUrl: 'https://instasafe.com/careers/',
  atsPlatform: 'official-company-careers-no-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-page-validation-only',
  extractionStrategy: 'verified-first-party-careers-page-without-public-openings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'instasafe.com',
  dryRunFile: 'instasafe/jobs.json',
  verifiedOn: '2026-08-15',
  verifiedPublicPostingCount: 0,
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary:
    'Verified on Saturday, August 15, 2026 that https://instasafe.com/careers/ is InstaSafe\'s live first-party careers page. The current public page now presents the official brand surface with title "Careers at InstaSafe | InstaSafe" and hero copy "Build the Future of Access.", but it exposes no trustworthy public jobs inventory, ATS handoff, or enumerable India openings on the first-party careers page. Although the legacy public Zoho Recruit portal and API still respond directly, the official careers page no longer links or embeds them, so this provider now fails closed and returns an honest empty result until InstaSafe restores a verifiable public openings surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default INSTASAFE_CATALOG
