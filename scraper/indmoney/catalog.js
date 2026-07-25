import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.indmoney.com/about is the live first-party INDmoney company page, that its Join Us section hands applicants to https://www.linkedin.com/company/indmoney/jobs/, and that the LinkedIn jobs URL redirected to https://in.linkedin.com/company/indmoney during verification. There is no trustworthy public jobs surface on indmoney.com.'

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
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'indmoney/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDMONEY_CATALOG
