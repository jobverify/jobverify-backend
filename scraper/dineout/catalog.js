import path from 'node:path'
import { fileURLToPath } from 'node:url'
const currentDir = path.dirname(fileURLToPath(import.meta.url))
export const VERIFIED_SURFACE_SUMMARY =
  'Verified on October 8, 2026 that the established parent careers URL https://careers.swiggy.com/ redirects to the first-party https://careers.swiggy.in/ application. Its application identifies Dineout as a Swiggy business and loads the complete public feed https://careers.swiggy.in/api/jobs.json. The feed hands off to SmartRecruiters SWIGGY job ads and the public API https://api.smartrecruiters.com/v1/companies/SWIGGY/postings. At that verification both inventories contained 178 parent roles, including 30 explicitly attributed to the Dine Out business unit in India. Runtime validates both complete parent inventories and reconciles the entire Dine Out cohort by title, city and business unit with multiplicity before filtering for explicit India locations. Unrelated business-unit differences do not invalidate this source; Dine Out disagreement reports unavailable inventory. Only Dine Out India roles with verified active public details are extracted for Dineout.'
export const DINEOUT_CATALOG = {
  source: 'dineout', companyName: 'Dineout', officialBrandName: 'Swiggy Dineout', parentCompanyName: 'Swiggy',
  adapter: 'script', modulePath: path.resolve(currentDir, 'script.js'), dryRunFile: 'dineout/jobs.json',
  homepageUrl: 'https://www.dineout.co.in/', canonicalConsumerSurfaceUrl: 'https://www.swiggy.com/dineout',
  companyCareerPage: 'https://careers.swiggy.in/', legacyCareersUrl: 'https://careers.swiggy.com/',
  jobsFeedUrl: 'https://careers.swiggy.in/api/jobs.json',
  jobsApiUrl: 'https://api.smartrecruiters.com/v1/companies/SWIGGY/postings',
  jobsBoardUrl: 'https://jobs.smartrecruiters.com/SWIGGY',
  companyDomain: 'dineout.co.in', atsPlatform: 'smartrecruiters', countryFilter: 'India',
  paginationStrategy: 'offset-paginated-parent-ats-with-count-checked-first-party-inventory',
  extractionStrategy: 'verified-parent-careers-migration+reconciled-dine-out-cohort+india-country-filter+job-details',
  parser: 'custom-script', normalizationProfile: 'engineering-default', verifiedOn: '2026-10-08',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}
export default DINEOUT_CATALOG
