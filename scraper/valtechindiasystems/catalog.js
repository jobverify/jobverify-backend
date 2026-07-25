import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VALTECH_INDIA_SYSTEMS_CATALOG = {
  source: 'valtechindiasystems',
  companyName: 'Valtech India Systems',
  officialBrandName: 'Valtech India',
  adapter: 'script',
  homepageUrl: 'https://careers.india.valtech.com/',
  companyCareerPage: 'https://careers.india.valtech.com/jobs',
  sampleJobUrl: 'https://careers.india.valtech.com/jobs/5421672-java-lead-developer',
  atsPlatform: 'teamtailor',
  countryFilter: 'India',
  paginationStrategy: 'first-party-teamtailor-listing-page',
  extractionStrategy: 'verified-teamtailor-job-listing+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'careers.india.valtech.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that the official Valtech India careers domain at https://careers.india.valtech.com/ exposes public Teamtailor job pages, that the job-listing surface is rooted at https://careers.india.valtech.com/jobs, and that sample first-party detail pages such as https://careers.india.valtech.com/jobs/5421672-java-lead-developer expose public role descriptions and apply actions on the same first-party domain.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VALTECH_INDIA_SYSTEMS_CATALOG
