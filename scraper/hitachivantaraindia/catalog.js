import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HITACHI_VANTARA_INDIA_CATALOG = {
  source: 'hitachivantaraindia',
  companyName: 'Hitachi Vantara India',
  officialBrandName: 'Hitachi Vantara India',
  officialCompanyLabel: 'HITACHI VANTARA INDIA PRIVATE LIMITED',
  adapter: 'script',
  companyCareerPage: 'https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs',
  companyDomain: 'careers.hitachi.com',
  atsPlatform: 'talemetry-careersites+workday-handoff',
  countryFilter: 'India',
  paginationStrategy: 'verified-company-filtered-search-page-or-cloudflare-challenge-sentinel',
  extractionStrategy: 'verified-search-and-detail-pages-when-accessible+verified-cloudflare-challenge-empty-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-14',
  verifiedSurfaceSummary:
    'Verified on Friday, August 14, 2026 that direct requests to https://careers.hitachi.com/search/hitachi-vantara-india-private-limited/jobs now return Cloudflare-managed HTTP 403 challenge pages titled "Just a moment..." with cf-mitigated: challenge from this environment. The public company-filtered route still reflects HITACHI VANTARA INDIA PRIVATE LIMITED in browser-visible crawls, including India 21 on the verified date, but the blocked responses expose no trustworthy fetchable listing or detail HTML here today, so this scraper returns [] only while that exact first-party route remains on the verified challenge shell.',
  dryRunFile: 'hitachivantaraindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default HITACHI_VANTARA_INDIA_CATALOG
