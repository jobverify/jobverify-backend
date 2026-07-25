import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NITOR_INFOTECH_CATALOG = {
  source: 'nitorinfotech',
  companyName: 'Nitor Infotech, an Ascendion company',
  officialBrandName: 'Nitor Infotech',
  adapter: 'script',
  homepageUrl: 'https://careers.nitorinfotech.com/',
  companyCareerPage: 'https://careers.nitorinfotech.com/',
  jobsBoardUrl: 'https://careers.nitorinfotech.com/opening',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy: 'verified-first-party-careers-page+openings-listing+india-filtered-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'nitorinfotech.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.nitorinfotech.com/ remained the exact first-party Nitor Infotech careers page, linked to https://careers.nitorinfotech.com/opening, and that the public openings page listed India roles including Engineering Manager, DevOps Architect, Dot Net - Architect, and Senior Software Engineer (Golang).',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NITOR_INFOTECH_CATALOG
