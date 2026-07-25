import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NEXDIGM_CATALOG = {
  source: 'nexdigm',
  companyName: 'Nexdigm',
  officialBrandName: 'Nexdigm',
  adapter: 'script',
  officialHomepageUrl: 'https://www.nexdigm.com/',
  companyCareerPage: 'https://www.nexdigm.com/careers/',
  officialCurrentOpeningsUrl: 'https://www.nexdigm.com/careers/current-openings/',
  officialCareerDetailsBaseUrl: 'https://www.nexdigm.com/careers/career-details/',
  officialApplyHost: 'https://gene.darwinbox.in/',
  companyDomain: 'nexdigm.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-current-openings-page-plus-detail-pages',
  extractionStrategy:
    'verified-careers-page+verified-current-openings-page+html-listings+first-party-detail-pages+darwinbox-apply-link',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'nexdigm/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.nexdigm.com/careers/ is the official Nexdigm careers page and links View All to the public first-party openings page at https://www.nexdigm.com/careers/current-openings/. That current-openings page exposes server-rendered listing cards with same-domain detail links, and the redirected detail route at https://www.nexdigm.com/careers/career-details/ publicly exposes role metadata plus a live apply handoff into https://gene.darwinbox.in/.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default NEXDIGM_CATALOG
