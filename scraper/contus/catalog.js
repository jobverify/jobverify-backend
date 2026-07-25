import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CONTUS_CATALOG = {
  source: 'contus',
  companyName: 'Contus',
  officialBrandName: 'CONTUS TECH',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.contus.com/careers.php',
  companyDomain: 'contus.com',
  atsPlatform: 'first-party-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-list',
  extractionStrategy: 'first-party-html-opening-cards+apply-link-extraction',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.contus.com/careers.php is CONTUS TECH\'s live first-party careers page and that the public HTML lists current openings with role titles, Chennai locations, and Apply Now links to company-hosted application routes.',
}

export default CONTUS_CATALOG
