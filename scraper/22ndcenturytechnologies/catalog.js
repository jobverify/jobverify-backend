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
  verifiedOn: '2026-08-01',
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that https://www.tscti.com/career/state_il remained the live first-party 22nd Century Technologies current-openings page for the State of Illinois contract. The verified page publicly exposed region-based fieldset tables with Apply Now links, including current mailto apply targets for roles such as Basic Clerical and Accounting Assistant.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TWENTY_SECOND_CENTURY_TECHNOLOGIES_CATALOG
