import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that Bentley Systems uses the first-party jobs host https://jobs.bentley.com/?locale=en_US from its official careers experience, and that the public India search surface at https://jobs.bentley.com/search/?searchby=location&q=&locationsearch=India&locale=en_US exposed live India roles including Senior Software Engineer in Pune, IN and User Engagement Advocate in Kolkata, WB, IN. A live public detail page was also verified at https://jobs.bentley.com/job/Pune-Senior-Software-Engineer/1409448100/ with a public description block and Apply now handoff.'

export const BENTLEY_SYSTEMS_CATALOG = {
  source: 'bentleysystems',
  companyName: 'Bentley Systems',
  officialBrandName: 'Bentley Systems',
  adapter: 'script',
  homepageUrl: 'https://www.bentley.com/',
  companyCareerPage: 'https://www.bentley.com/company/careers/',
  officialJobsHostUrl: 'https://jobs.bentley.com/?locale=en_US',
  indiaSearchUrl: 'https://jobs.bentley.com/search/?searchby=location&q=&locationsearch=India&locale=en_US',
  sampleJobUrl: 'https://jobs.bentley.com/job/Pune-Senior-Software-Engineer/1409448100/',
  companyDomain: 'bentley.com',
  atsPlatform: 'successfactors',
  countryFilter: 'India',
  paginationStrategy: 'single-location-search-page',
  extractionStrategy:
    'verified-first-party-jobs-host+india-location-search-results+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'bentleysystems/jobs.json',
}

export default BENTLEY_SYSTEMS_CATALOG
