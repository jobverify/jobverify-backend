import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG = {
  source: 'extentiainformationtechnology',
  companyName: 'Extentia Information Technology',
  officialBrandName: 'Extentia',
  adapter: 'script',
  homepageUrl: 'https://www.extentia.com/',
  companyCareerPage: 'https://www.extentia.com/careers/careers-opportunities/',
  companyDomain: 'extentia.com',
  atsPlatform: 'official-first-party-job-links',
  countryFilter: 'India',
  paginationStrategy: 'multi-page-first-party-role-archive',
  extractionStrategy: 'verified-role-archive+detail-links+first-party-more-details-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.extentia.com/careers/careers-opportunities/ is the live first-party Extentia role archive and that it exposes public role links such as .Net Fullstack Developer, Senior Salesforce Developer, and UX Designer, each paired with city and job-type metadata plus first-party More Details pages on extentia.com.',
  dryRunFile: 'extentiainformationtechnology/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default EXTENTIA_INFORMATION_TECHNOLOGY_CATALOG
