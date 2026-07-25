import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SLICE_CATALOG = {
  source: 'slice',
  companyName: 'Slice',
  officialBrandName: 'Slice',
  adapter: 'script',
  companyCareerPage: 'https://slice.bank.in/careers/',
  officialBankApplyPageUrl: 'https://slice.bank.in/careers/apply',
  alternateCompanyCareerPage: 'https://slice.careers/',
  bankCompanyLegalName: 'slice small finance bank ltd',
  alternateCompanyReferenceDomain: 'about.slicelife.com',
  companyDomain: 'slice.bank.in',
  alternateCompanyDomain: 'slice.careers',
  atsPlatform: 'ambiguous-exact-name-multiple-first-party-companies',
  countryFilter: 'India',
  paginationStrategy: 'multiple-first-party-exact-name-careers-surface-validation',
  extractionStrategy:
    'verified-slice-bank-careers+verified-slice-careers+exact-name-ambiguity-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://slice.bank.in/careers/ and https://slice.bank.in/careers/apply belong to slice small finance bank ltd, while https://slice.careers/ belongs to a different Slice company tied to Ilir Sela and about.slicelife.com. This exact-name ambiguity means the backlog row "Slice" does not disambiguate between two live first-party exact-name companies, so this provider fails closed and returns [] until the row is clarified.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default SLICE_CATALOG
