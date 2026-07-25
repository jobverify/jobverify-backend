import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MODEL_N_CATALOG = {
  source: 'modeln',
  companyName: 'Model N',
  adapter: 'script',
  companyCareerPage: 'https://www.modeln.com/company/careers/',
  companyDomain: 'modeln.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-page-with-empty-open-positions-state',
  extractionStrategy: 'verified-first-party-careers-page+verified-open-positions-empty-state-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.modeln.com/company/careers/ was the live first-party Model N careers page and that its Open Positions section rendered the empty-state text "No results" instead of any public role cards. The same page still highlighted Great Place to Work Certified in India branding, but it did not expose a trustworthy public jobs surface on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default MODEL_N_CATALOG
