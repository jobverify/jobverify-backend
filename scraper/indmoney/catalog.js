import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on August 2, 2026 that https://www.indmoney.com/about is the live first-party INDmoney company page, that its Join Us section still hands applicants to https://www.linkedin.com/company/indmoney/jobs/, and that the page does not expose a trustworthy first-party public jobs surface on indmoney.com.'

export const INDMONEY_CATALOG = {
  source: 'indmoney',
  companyName: 'INDmoney',
  officialBrandName: 'INDmoney',
  adapter: 'script',
  homepageUrl: 'https://www.indmoney.com/',
  companyCareerPage: 'https://www.indmoney.com/about',
  aboutPageUrl: 'https://www.indmoney.com/about',
  linkedinJobsUrl: 'https://www.linkedin.com/company/indmoney/jobs/',
  companyDomain: 'indmoney.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-about-page-plus-linkedin-handoff-validation',
  extractionStrategy:
    'verified-official-about-page+verified-linkedin-handoff+no-first-party-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'indmoney/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDMONEY_CATALOG
