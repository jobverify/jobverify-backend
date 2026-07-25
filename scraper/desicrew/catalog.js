import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://desicrew.in/ is the live first-party homepage, that https://desicrew.in/about-us/careers/ is the live first-party careers page, that https://desicrew.in/open-job-positions/ is the public first-party openings archive, that https://desicrew.in/wp-json/wp/v2/open-job-position?per_page=100&_fields=id,date,modified,status,link,title,slug,content,type exposes the same three live public openings, and that https://desicrew.in/open-job-position/qa-delivery-manager/ is a same-domain detail page with an inline apply form.'

export const DESI_CREW_CATALOG = {
  source: 'desicrew',
  companyName: 'Desi Crew',
  officialBrandName: 'DesiCrew',
  adapter: 'script',
  homepageUrl: 'https://desicrew.in/',
  careersPageUrl: 'https://desicrew.in/about-us/careers/',
  companyCareerPage: 'https://desicrew.in/open-job-positions/',
  jobsArchiveUrl: 'https://desicrew.in/open-job-positions/',
  jobsApiUrl:
    'https://desicrew.in/wp-json/wp/v2/open-job-position?per_page=100&_fields=id,date,modified,status,link,title,slug,content,type',
  sampleJobUrl: 'https://desicrew.in/open-job-position/qa-delivery-manager/',
  companyDomain: 'desicrew.in',
  atsPlatform: 'first-party-wordpress-open-job-position',
  countryFilter: 'India',
  paginationStrategy: 'first-party-open-job-archive-plus-public-rest-endpoint',
  extractionStrategy:
    'verified-homepage+verified-careers-page+verified-open-job-archive+verified-open-job-rest-api+first-party-detail-pages-with-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'desicrew/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DESI_CREW_CATALOG
