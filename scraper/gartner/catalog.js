import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://jobs.gartner.com/ is the live first-party Gartner careers domain, that https://jobs.gartner.com/jobs/?country=India browser-renders 36 unique India jobs across two distinct result pages before later page numbers repeat, and that each public detail page on jobs.gartner.com exposes a direct Workday apply handoff. Direct Node fetches to the same careers URLs returned a Cloudflare "Just a moment..." interstitial, so the trusted contract is the browser-rendered first-party listing and detail HTML.'

export const GARTNER_CATALOG = {
  source: 'gartner',
  companyName: 'Gartner',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'gartner/jobs.json',
  homepageUrl: 'https://jobs.gartner.com/',
  companyCareerPage: 'https://jobs.gartner.com/jobs/?country=India',
  companyDomain: 'jobs.gartner.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'browser-rendered-page-query-until-no-new-results',
  extractionStrategy: 'browser-rendered-listing-cards+detail-pages+workday-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default GARTNER_CATALOG
