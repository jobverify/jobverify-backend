import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const WISSEN_TECHNOLOGY_CATALOG = {
  source: 'wissentechnology',
  companyName: 'Wissen Technology',
  officialBrandName: 'Wissen',
  adapter: 'script',
  homepageUrl: 'https://www.wissen.com/',
  companyCareerPage: 'https://www.wissen.com/career/opportunities-wissen-technology?p=job%2FoKedhfwc',
  contactPageUrl: 'https://www.wissen.com/contact/writetous',
  companyDomain: 'wissen.com',
  atsPlatform: 'first-party-openings-page-with-contact-handoff',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-openings-page',
  extractionStrategy:
    'verified-first-party-openings-page+visible-job-cards+write-to-us-contact-handoff',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.wissen.com/career/opportunities-wissen-technology?p=job%2FoKedhfwc is the official Wissen Technology openings page, that it publicly listed roles including Senior Level Java Technical Lead and Data Engineer, and that its Send resume now handoff resolves to https://www.wissen.com/contact/writetous. This provider extracts visible openings directly from the first-party page.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'wissentechnology/jobs.json',
}

export default WISSEN_TECHNOLOGY_CATALOG
