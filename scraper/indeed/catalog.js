import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on August 2, 2026 that the official global Indeed careers route at https://www.indeed.com/careers, the India handoff at https://in.indeed.com/careers, and the India company jobs page at https://in.indeed.com/cmp/Indeed/jobs can all surface a Cloudflare interstitial ("Just a moment..." / "Additional Verification Required") in this environment even after browser rendering. The scraper still parses the verified first-party jobs page when it is reachable, but now treats the fully challenge-gated first-party state as an authoritative no-data outcome and returns no jobs until the listings become publicly reachable again.'

export const INDEED_CATALOG = {
  source: 'indeed',
  companyName: 'Indeed',
  officialBrandName: 'Indeed',
  adapter: 'script',
  companyCareerPage: 'https://www.indeed.com/careers',
  indiaCareersPage: 'https://in.indeed.com/careers',
  indiaJobsPage: 'https://in.indeed.com/cmp/Indeed/jobs',
  companyDomain: 'indeed.com',
  atsPlatform: 'indeed-first-party-company-jobs',
  countryFilter: 'India',
  paginationStrategy: 'verified-global-careers-page-plus-india-company-jobs-page',
  extractionStrategy:
    'verified-global-careers-page+verified-india-company-jobs-page+public-listings-html+cloudflare-fail-closed',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'indeed/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDEED_CATALOG
