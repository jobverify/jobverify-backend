import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.boeing.com/careers/ redirects to the live first-party careers site at https://jobs.boeing.com/, that https://jobs.boeing.com/search-jobs/India/185/2/1269750/22/79/50/2 exposed 14 public India job cards on the verified date, and that detail pages such as https://jobs.boeing.com/job/bengaluru/experienced-software-engineer-ui-ux-designer/185/97595724928 are public first-party job descriptions with Apply Now handoff to Boeing Workday.'

export const BOEING_INDIA_CATALOG = {
  source: 'boeingindia',
  companyName: 'Boeing India',
  officialBrandName: 'Boeing',
  adapter: 'script',
  homepageUrl: 'https://www.boeing.com/careers/',
  careersLandingUrl: 'https://jobs.boeing.com/',
  companyCareerPage: 'https://jobs.boeing.com/search-jobs/India/185/2/1269750/22/79/50/2',
  searchResultsUrl: 'https://jobs.boeing.com/search-jobs/India/185/2/1269750/22/79/50/2',
  sampleJobUrl: 'https://jobs.boeing.com/job/bengaluru/experienced-software-engineer-ui-ux-designer/185/97595724928',
  companyDomain: 'jobs.boeing.com',
  atsPlatform: 'talentbrew-radancy',
  countryFilter: 'India',
  paginationStrategy: 'page-query',
  extractionStrategy: 'verified-careers-redirect+india-search-results+detail-pages+workday-apply-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'boeingindia/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BOEING_INDIA_CATALOG
