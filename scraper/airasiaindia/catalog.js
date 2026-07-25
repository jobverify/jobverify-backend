import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AIRASIA_INDIA_CATALOG = {
  source: 'airasiaindia',
  companyName: 'AirAsia India',
  adapter: 'script',
  companyCareerPage: 'https://www.airasia.com/in/en/careers',
  companyDomain: 'airasia.com',
  atsPlatform: 'legacy-brand-redirect-to-air-india-express-careers',
  countryFilter: 'India',
  paginationStrategy:
    'legacy-airasia-india-redirect-plus-aix-connect-parked-pages-plus-air-india-express-careers-validation',
  extractionStrategy:
    'verified-airasia-move-redirect+verified-aix-connect-parked-pages+verified-air-india-express-careers-brand-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  legacyHomepageUrl: 'https://www.airasia.com/in/en',
  legacyMoveUrl: 'https://www.airasia.com/en/gb',
  parkedRebrandUrl: 'https://aixconnect.in/',
  parkedRebrandCareersUrl: 'https://aixconnect.in/careers',
  mergedCarrierHomepageUrl: 'https://www.airindiaexpress.com/home',
  mergedCarrierCareersUrl: 'https://www.airindiaexpress.com/careers',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'As of July 15, 2026, https://www.airasia.com/in/en and https://www.airasia.com/in/en/careers resolve to AirAsia MOVE at https://www.airasia.com/en/gb, https://aixconnect.in/ and https://aixconnect.in/careers are parked "Coming Soon" pages, and https://www.airindiaexpress.com/careers is an Air India Express-branded careers page, so there is no trustworthy AirAsia India-branded public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AIRASIA_INDIA_CATALOG
