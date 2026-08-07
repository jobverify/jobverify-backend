import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG = {
  source: 'cambridgetechnologyenterprises',
  companyName: 'Cambridge Technology Enterprises',
  officialBrandName: 'Cambridge Technology',
  adapter: 'script',
  homepageUrl: 'https://www.cambridgetech.com/',
  companyCareerPage: 'https://www.cambridgetech.com/',
  officialJobsBoardUrl: 'https://cambridgetechnology.freshteam.com/jobs/search?utf8=%E2%9C%93&query=&branch_id=&remote=0&remote=1&commit=Go',
  detailUrlPattern: 'https://cambridgetechnology.freshteam.com/jobs/{opaque_id}/{slug}',
  atsPlatform: 'freshteam',
  countryFilter: 'India',
  paginationStrategy: 'official-homepage-plus-public-freshteam-board',
  extractionStrategy: 'verified-homepage-handoff+public-freshteam-board-or-zero-state+detail-page-apply-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cambridgetech.com',
  verifiedOn: '2026-08-01',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that https://www.cambridgetech.com/ was the live first-party Cambridge Technology homepage, that its careers CTA labeled "See Open Positions" now handed off to the public Freshteam filtered search at https://cambridgetechnology.freshteam.com/jobs/search?utf8=%E2%9C%93&query=&branch_id=&remote=0&remote=1&commit=Go, and that the board publicly showed Open Positions with the current zero-results state "No jobs found". No trustworthy public India openings were exposed on the verified Freshteam surface, so this provider now returns an empty result.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'cambridgetechnologyenterprises/jobs.json',
}

export default CAMBRIDGE_TECHNOLOGY_ENTERPRISES_CATALOG
