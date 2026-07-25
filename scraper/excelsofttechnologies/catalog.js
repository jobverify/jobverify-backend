import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EXCELSOFT_TECHNOLOGIES_CATALOG = {
  source: 'excelsofttechnologies',
  companyName: 'ExcelSoft Technologies',
  officialBrandName: 'Excelsoft Technologies',
  adapter: 'script',
  companyCareerPage: 'https://www.excelsoftcorp.com/career/',
  companyDomain: 'excelsoftcorp.com',
  atsPlatform: 'official-company-site-no-public-openings',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-landing-page-validation',
  extractionStrategy: 'verified-careers-landing-page+no-public-openings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that Excelsoft Technologies used the first-party careers landing page at https://www.excelsoftcorp.com/career/, but the page remained a branding surface with the headings "One Team One Dream" and "Being an Excelian is just a choice away!" and did not expose a trustworthy public openings list or first-party apply links.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default EXCELSOFT_TECHNOLOGIES_CATALOG
