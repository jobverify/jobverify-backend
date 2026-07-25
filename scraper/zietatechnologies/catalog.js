import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZIETA_TECHNOLOGIES_CATALOG = {
  source: 'zietatechnologies',
  companyName: 'Zieta Technologies',
  officialBrandName: 'ZIETA',
  adapter: 'script',
  homepageUrl: 'https://www.zietatech.com/',
  companyCareerPage: 'https://www.zietatech.com/index.php?page=careers',
  atsPlatform: 'first-party-careers-page-inline-opening',
  countryFilter: 'United States',
  paginationStrategy: 'single-first-party-careers-opening-page',
  extractionStrategy: 'verified-careers-page+inline-opening-text+modal-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'zietatech.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.zietatech.com/index.php?page=careers was the live first-party ZIETA careers page, that it exposed an inline opening titled LEAD SYSTEMS ANALYST, and that the same page published the apply action "Apply here" alongside the Roswell, GA 30076 resume handoff text.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default ZIETA_TECHNOLOGIES_CATALOG
