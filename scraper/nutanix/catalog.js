import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that Nutanix\'s official careers surface at https://careers.nutanix.com/en/jobs/ is live in-browser, but direct non-browser fetches currently return a Cloudflare challenge page, and that Nutanix\'s public Jobvite surfaces at https://jobs.jobvite.com/nutanix and https://jobs.jobvite.com/nutanix/jobs are live, Nutanix-branded, cross-link back to the official current openings page, and expose India openings including Director of Field Marketing, India plus multiple Bangalore and Pune roles.'

export const NUTANIX_CATALOG = {
  source: 'nutanix',
  companyName: 'Nutanix',
  adapter: 'script',
  companyCareerPage: 'https://careers.nutanix.com/en/jobs/',
  companyDomain: 'nutanix.com',
  officialCareersHandoffUrl: 'https://jobs.jobvite.com/nutanix',
  jobListingsPageUrl: 'https://jobs.jobvite.com/nutanix/jobs',
  atsPlatform: 'jobvite',
  countryFilter: 'India',
  paginationStrategy: 'verified-official-careers-page-plus-public-jobvite-current-openings-board',
  extractionStrategy:
    'verified-official-careers-page+official-job-detail-apply-handoff+public-jobvite-current-openings+india-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'nutanix/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default NUTANIX_CATALOG
