import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://www.taaltech.com/careers/ is the live first-party TAAL Tech Jobs Archive, that page 1 publicly lists Technical Publications Engineer (Video-Based Training), that page 2 still lists Piping Designers - Plant 3D and other Bangalore roles, that page 3 terminates the archive with "No jobs found", and that the verified role detail pages still expose Apply For This Job forms and structured role details. This company therefore uses a real first-party archive scraper.'

export const TAAL_TECH_INDIA_CATALOG = {
  source: 'taaltechindia',
  companyName: 'Taal Tech India',
  officialBrandName: 'TAAL Tech',
  adapter: 'script',
  homepageUrl: 'https://www.taaltech.com/',
  companyCareerPage: 'https://www.taaltech.com/careers/',
  companyDomain: 'taaltech.com',
  atsPlatform: 'official-first-party-jobs-archive',
  countryFilter: 'India',
  paginationStrategy: 'paged-wordpress-jobs-archive-until-no-jobs-found',
  extractionStrategy: 'jobs-archive-listings+detail-pages+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'taaltechindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default TAAL_TECH_INDIA_CATALOG
