import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const JUEGO_STUDIO_CATALOG = {
  source: 'juegostudio',
  companyName: 'Juego Studio',
  officialBrandName: 'Juego Studio',
  adapter: 'script',
  homepageUrl: 'https://www.juegostudio.com/',
  companyCareerPage: 'https://www.juegostudio.com/careers',
  companyDomain: 'juegostudio.com',
  atsPlatform: 'first-party-open-positions-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-open-positions-page',
  extractionStrategy: 'first-party-html-opening-sections+apply-link-extraction+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.juegostudio.com/careers was Juego Studio\'s live first-party careers page and that the public HTML exposed an "OPEN POSITIONS" section with attributable roles including "3D Artist I / II" and "UI UX Designer", plus department, position, experience, and apply links on the first-party surface.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default JUEGO_STUDIO_CATALOG
