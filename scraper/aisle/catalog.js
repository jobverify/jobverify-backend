import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AISLE_CATALOG = {
  source: 'aisle',
  companyName: 'Aisle',
  adapter: 'script',
  companyCareerPage: 'https://www.aisle.co/',
  companyDomain: 'aisle.co',
  atsPlatform: 'freshteam',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-public-freshteam-board',
  extractionStrategy: 'verified-homepage-handoff+public-freshteam-board+detail-page-apply-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialHomepageUrl: 'https://www.aisle.co/',
  officialJobsBoardUrl: 'https://aisle.freshteam.com/jobs',
  detailUrlPattern: 'https://aisle.freshteam.com/jobs/{opaque_id}/{slug}',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.aisle.co/ is the live first-party Aisle homepage, the homepage careers CTA says "Check Openings" and links directly to https://aisle.freshteam.com/jobs, and that public Freshteam board currently renders an "Aisle Careers" / "Open Positions" shell with a "No jobs found" empty state.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AISLE_CATALOG
