import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IPROGRAMMER_SOLUTIONS_CATALOG = {
  source: 'iprogrammersolutions',
  companyName: 'Iprogrammer Solutions',
  officialBrandName: 'iProgrammer Solutions',
  adapter: 'script',
  homepageUrl: 'https://iprogrammer.com/',
  companyCareerPage: 'https://iprogrammer.com/current-openings-pune/',
  companyDomain: 'iprogrammer.com',
  atsPlatform: 'official-first-party-job-listing-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy: 'job-card-listing-with-detail-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://iprogrammer.com/current-openings-pune/ was the live first-party Iprogrammer Solutions openings page and that it publicly listed Current Openings including DevOps Engineer, Odoo QA Engineer, Lead NodeJS Engineer, and ReactJS Developer with Pune work-mode metadata on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'iprogrammersolutions/jobs.json',
}

export default IPROGRAMMER_SOLUTIONS_CATALOG
