import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 25, 2026 that https://www.splunk.com/en_us/careers/search-jobs.hml.html remained a live first-party Splunk entry point, that it now brands as "Working at Splunk - Cisco Careers" and hands applicants to the first-party Cisco-hosted search page at https://careers.cisco.com/global/en/splunk/search-page, that the live embedded search payload on that page exposed 59 Splunk-branded public openings with no India country bucket, and that the first-party India route at https://careers.cisco.com/global/en/splunk/india was live but its embedded India-filtered payload returned 0 hits with country aggregation India: 0.'

export const SPLUNK_CATALOG = {
  source: 'splunk',
  companyName: 'Splunk',
  officialBrandName: 'Splunk',
  adapter: 'script',
  companyCareerPage: 'https://www.splunk.com/en_us/careers/search-jobs.hml.html',
  companyDomain: 'splunk.com',
  canonicalCareersLandingUrl: 'https://careers.cisco.com/global/en/splunk',
  officialSearchPageUrl: 'https://careers.cisco.com/global/en/splunk/search-page',
  indiaJobsPageUrl: 'https://careers.cisco.com/global/en/splunk/india',
  atsPlatform: 'official-first-party-cisco-careers-search',
  countryFilter: 'India',
  paginationStrategy:
    'verified-first-party-splunk-entry-plus-cisco-search-pages-with-embedded-json-empty-india-slice',
  extractionStrategy:
    'verified-splunk-first-party-entry+verified-cisco-search-page-embedded-json+verified-india-filtered-empty-slice+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'splunk/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SPLUNK_CATALOG
