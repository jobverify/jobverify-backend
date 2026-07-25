import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GRAB_CATALOG = {
  source: 'grab',
  companyName: 'Grab',
  officialBrandName: 'Grab',
  adapter: 'script',
  homepageUrl: 'https://www.grab.careers/en/',
  companyCareerPage: 'https://www.grab.careers/jobs',
  indiaLocationPageUrl: 'https://www.grab.careers/en/locations/india/',
  sampleIndiaJobUrl:
    'https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/',
  sampleSecondaryIndiaJobUrl:
    'https://www.grab.careers/en/jobs/744000138121215/solutions-specialist-epm-finance-systems/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'first-party-jobs-board-plus-india-location-page-html-cards',
  extractionStrategy:
    'verified-first-party-jobs-board+verified-india-location-page+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'grab.careers',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.grab.careers/en/ was the live first-party Grab careers homepage, that https://www.grab.careers/jobs published the first-party jobs board, and that https://www.grab.careers/en/locations/india/ exposed a Join our team in India section plus the first-party India detail page https://www.grab.careers/en/jobs/744000109177995/senior-techno-functional-oracle-integration-specialist/ for Senior Techno-Functional Oracle Integration Specialist in Bengaluru, India.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default GRAB_CATALOG
