import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SETU_CATALOG = {
  source: 'setu',
  companyName: 'Setu',
  officialBrandName: 'BrokenTusk Technologies Pvt. Ltd.',
  adapter: 'script',
  companyCareerPage: 'https://setu.co/careers/',
  officialCareersPageUrl: 'https://setu.co/careers/',
  currentOpeningsCsvUrl:
    'https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CurrentOpenings.csv',
  categoryDescriptionsCsvUrl:
    'https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CategoryDescriptions.csv',
  companyDomain: 'setu.co',
  atsPlatform: 'first-party-careers-csv-plus-turbohire-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-public-openings-csv',
  extractionStrategy:
    'verified-first-party-careers-page+verified-current-openings-csv+verified-category-description-csv+turbohire-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-26',
  verifiedSurfaceSummary:
    'Verified on Sunday, July 26, 2026 that the official Setu public hiring surface for this exact-name provider remains the first-party careers page at https://setu.co/careers/. The verified careers shell still exposes the Current openings section with a Fetching open roles placeholder, and the live client-side requests now pull public openings from https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CurrentOpenings.csv plus category descriptions from https://raw.githubusercontent.com/SetuHQ/website-content/refs/heads/main/careers/Setu%20Website%20-%20CategoryDescriptions.csv. Those CSVs currently expose TurboHire apply links under https://pinelabsgroup.turbohire.co/get/ and live roles including SDE - II Fullstack Engineer and SDE - II Backend Engineer.',
  dryRunFile: 'setu/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SETU_CATALOG
