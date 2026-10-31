import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG = {
  source: 'anrsoftwareprivatelimited',
  companyName: 'ANR Software Private Limited',
  officialBrandName: 'ANR Software Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.anrsoftware.com/',
  companyCareerPage: 'https://www.anrsoftware.com/career/',
  atsPlatform: 'first-party-careers-card-criteria-unresolved',
  countryFilter: 'India',
  paginationStrategy: 'unverified-global-and-closing-scope',
  extractionStrategy: 'card-owned-declared-criteria-and-controls+unknown-country-audit+discovery-only',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'anrsoftware.com',
  sourceScopeComplete: false,
  sourceListingComplete: false,
  lifecycleCleanupAllowed: false,
  authoritativeSourceTotal: null,
  authoritativeIndiaFacetCount: null,
  zeroResultPolicy: 'evidence-required',
  verifiedOn: '2026-07-18',
  verificationIsHistorical: true,
  verifiedSurfaceSummary:
    'Historical July 18 metadata, not current qualification: Verified on Saturday, July 18, 2026 that https://www.anrsoftware.com/career/ is the live first-party ANR Software careers page and exposes role cards, but the same public rows simultaneously advertise opening counts and the explicit empty-state message "No vacancy for this position now. Visit again!" across the page. Because the public first-party contract is contradictory and not trustworthy enough to enumerate open roles honestly, this provider fails closed and returns an empty list.',
  currentSurfaceSummary: 'Retained October 29 HTML contains role-card criteria and controls with unresolved duplicate native IDs, role countries and external style/accordion activation. Raw card blocks and all form definitions are audited; no authoritative empty/source/India count or cleanup permission is established.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ANR_SOFTWARE_PRIVATE_LIMITED_CATALOG
