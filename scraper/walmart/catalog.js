import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  "Verified on Sunday, July 26, 2026 that Walmart's official careers surface had moved off the stale Workday tenant to https://careers.walmart.com/us/en, that the first-party Technology and Corporate pages route candidates into the live results surface at https://careers.walmart.com/us/en/results, and that the public search endpoint at https://careers.walmart.com/api/ai/search-ai/api/v1/combined/hybrid-search still returned structured Walmart job results for generic role queries while explicit India searches returned a verified zero-job slice with an India filter expression. The legacy Workday URL https://walmart.wd5.myworkdayjobs.com/en-US/WalmartExternal returned HTTP 500 during live verification, and no trustworthy enumerable first-party India results feed could be reproduced from Walmart's current public results experience."

export const WALMART_CATALOG = {
  source: 'walmart',
  companyName: 'Walmart',
  officialBrandName: 'Walmart',
  adapter: 'script',
  homepageUrl: 'https://careers.walmart.com/us/en',
  companyCareerPage: 'https://careers.walmart.com/us/en/results',
  officialCareersPageUrl: 'https://careers.walmart.com/us/en/results',
  technologyCareersPageUrl: 'https://careers.walmart.com/us/en/home/careers-areas/technology',
  corporateCareersPageUrl: 'https://careers.walmart.com/us/en/home/careers-areas/corporate',
  searchApiUrl: 'https://careers.walmart.com/api/ai/search-ai/api/v1/combined/hybrid-search',
  companyDomain: 'careers.walmart.com',
  atsPlatform: 'official-first-party-careers-search-page-fail-closed',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-career-area-pages-plus-live-zero-india-search-validation',
  extractionStrategy:
    'verified-homepage+verified-technology-and-corporate-pages+verified-live-search-api-zero-india-slice-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  exactCompanyMatchOnly: true,
  verifiedOn: '2026-07-26',
  verifiedIndiaJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'walmart/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default WALMART_CATALOG
