import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AGILISIUM_CATALOG = {
  source: 'agilisium',
  companyName: 'Agilisium',
  officialBrandName: 'Agilisium',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.agilisium.com/',
  companyCareerPage: 'https://www.agilisium.com/people-and-careers',
  jobsBoardUrl: 'https://agilisium.zohorecruit.com/jobs/Careers',
  atsPlatform: 'official-careers-page-plus-zohorecruit-board',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-handoff-plus-single-public-board-validation',
  extractionStrategy: 'verified-first-party-careers-page+verified-zohorecruit-board-return-empty-until-parser-is-promoted',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'agilisium.com',
  dryRunFile: 'agilisium/jobs.json',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.agilisium.com/people-and-careers was the live first-party Agilisium careers page and that its Explore Open Roles CTA handed applicants to the public Zoho Recruit board at https://agilisium.zohorecruit.com/jobs/Careers.',
}

export default AGILISIUM_CATALOG
