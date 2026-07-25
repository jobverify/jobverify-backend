import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QBSS_CATALOG = {
  source: 'qbss',
  companyName: 'Qbss',
  officialBrandName: 'Quatrro Business Support Services',
  adapter: 'script',
  companyCareerPage: 'https://www.quatrrobss.com/careers/',
  workingAtUrl: 'https://www.quatrrobss.com/working-at-quatrro/',
  companyDomain: 'quatrrobss.com',
  atsPlatform: 'official-company-careers-cloudflare-blocked',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-careers-routes-cloudflare-block-validation',
  extractionStrategy:
    'verified-qbss-careers-route+verified-working-at-route+cloudflare-block-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the legacy first-party QBSS routes https://www.quatrrobss.com/careers/ and https://www.quatrrobss.com/working-at-quatrro/ both returned Cloudflare "Sorry, you have been blocked" pages from this environment, while public search results still referenced Quatrro Business Support Services and its ContinuServe rebrand. Because the exact-name first-party jobs surface is blocked to anonymous enumeration, this provider fails closed and returns no jobs until the public surface becomes crawlable again.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default QBSS_CATALOG
