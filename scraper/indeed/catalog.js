import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.indeed.com/careers is the official global Indeed careers page headed "We help people get jobs." with the first-party India handoff at https://in.indeed.com/careers, and that the India company jobs surface at https://in.indeed.com/cmp/Indeed/jobs exposed 16 jobs at Indeed including Software Engineer III, Software Engineer II, and National Account Manager roles. Direct non-browser fetches from this environment currently encounter a Cloudflare security check on the India jobs page, so the scraper is challenge-aware and fails closed when that checkpoint is served instead of the public listings HTML.'

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
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'indeed/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDEED_CATALOG
