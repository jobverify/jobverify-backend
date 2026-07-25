import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RURALSHORES_CATALOG = {
  source: 'ruralshores',
  companyName: 'RuralShores',
  officialBrandName: 'RuralShores',
  adapter: 'script',
  companyCareerPage: 'https://www.ruralshores.com/career.html',
  officialCareersPageUrl: 'https://www.ruralshores.com/career.html',
  companyDomain: 'ruralshores.com',
  atsPlatform: 'first-party-html-board',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy: 'verified-first-party-careers-page+html-jobcards+mailto-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.ruralshores.com/career.html was the live first-party RuralShores careers page and that it exposed a Current Openings section with public HTML jobcards for roles including Deputy Manager - Service Delivery and Assistant Manager - Projects. Verified that the visible Assistant Manager - Projects card showed requisition RSBS/REC/2026026 even though the mailto subject still carried RSBS/REC/2026013, so this exact-name provider trusts the visible first-party card ID as the authoritative requisition value.',
  dryRunFile: 'ruralshores/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default RURALSHORES_CATALOG
