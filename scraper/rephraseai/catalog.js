import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that the exact-name first-party homepage at https://www.rephraseai.com/ renders the live Rephrase AI marketing site for AI writing and rewriting tools and exposes no public careers, jobs, apply, or ATS links. Verified that the common first-party routes https://www.rephraseai.com/about, https://www.rephraseai.com/careers, and https://www.rephraseai.com/jobs each render a 404-style page with no trustworthy public jobs surface, so this provider must fail closed and return an empty array until an official public hiring surface appears.'

export const REPHRASE_AI_CATALOG = {
  source: 'rephraseai',
  companyName: 'Rephrase.ai',
  officialBrandName: 'Rephrase AI',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'rephraseai/jobs.json',
  officialHomepageUrl: 'https://www.rephraseai.com/',
  aboutPageUrl: 'https://www.rephraseai.com/about',
  companyCareerPage: 'https://www.rephraseai.com/careers',
  jobsPageUrl: 'https://www.rephraseai.com/jobs',
  companyDomain: 'rephraseai.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'browser-verified-homepage-plus-common-careers-routes',
  extractionStrategy:
    'verified-homepage-without-careers-links+verified-about-careers-jobs-404-routes+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default REPHRASE_AI_CATALOG
