import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG = {
  source: '22ndcenturytechnologies',
  companyName: '22nd Century Technologies',
  officialBrandName: '22nd Century Technologies',
  adapter: 'script',
  companyCareerPage: 'https://www.tscti.com/career/state_il',
  companyDomain: 'tscti.com',
  atsPlatform: 'official-first-party-job-cards',
  countryFilter: 'United States',
  paginationStrategy: 'single-first-party-contract-page',
  extractionStrategy: 'verified-first-party-current-openings-contract-page+region-job-table+first-party-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.tscti.com/career/state_il was a live first-party 22nd Century Technologies current-openings page for the State of Illinois contract. The verified page publicly exposed region-based job tables with first-party Apply Now links and role labels including Basic Clerical, Accounting Assistant, Accounting Lead, Telephone Operator, Data Entry I, Data Entry II, Data Entry Ill, Lead Worker, Light Industrial, and Others.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG
