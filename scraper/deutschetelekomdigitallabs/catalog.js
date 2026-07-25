import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DEUTSCHE_TELEKOM_DIGITAL_LABS_CATALOG = {
  source: 'deutschetelekomdigitallabs',
  companyName: 'Deutsche Telekom Digital Labs',
  officialBrandName: 'Deutsche Telekom Digital Labs',
  adapter: 'script',
  homepageUrl: 'https://dtdl.in/',
  companyCareerPage: 'https://dtdl.in/',
  telekomWorldwidePageUrl: 'https://www.telekom.com/en/company/worldwide',
  companyDomain: 'dtdl.in',
  atsPlatform: 'affiliate-page-plus-exact-name-shell-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'affiliate-page-plus-shell-validation',
  extractionStrategy: 'telekom-affiliate-page+exact-name-js-shell+common-route-validation-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.telekom.com/en/company/worldwide still identified that DT Digital Labs in India is responsible for product development and linked to https://dtdl.in/, and that the exact-name first-party host remained a JavaScript shell showing "You need to enable JavaScript to run this app" without a trustworthy public jobs surface.',
  dryRunFile: 'deutschetelekomdigitallabs/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default DEUTSCHE_TELEKOM_DIGITAL_LABS_CATALOG
