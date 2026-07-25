import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://neysa.ai/careers/ is the official first-party Neysa careers page and that its View Job Openings link leads to the same-domain public jobs board at https://neysa.ai/careers/job-openings/. Live verification on Thursday, July 16, 2026 confirmed that the job openings page rendered 12 public jobs and that role detail pages such as https://neysa.ai/careers/job-openings/backend-engineer/ expose first-party job descriptions. The Neysa legal entity name Neysa Networks Private Limited is disclosed on the first-party privacy page at https://neysa.ai/privacy-policy/.'

export const NEYSA_CATALOG = {
  source: 'neysa',
  companyName: 'Neysa',
  officialBrandName: 'Neysa',
  legalEntityName: 'Neysa Networks Private Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'neysa/jobs.json',
  homepageUrl: 'https://neysa.ai/',
  companyCareerPage: 'https://neysa.ai/careers/',
  companyDomain: 'neysa.ai',
  officialJobOpeningsUrl: 'https://neysa.ai/careers/job-openings/',
  officialAboutUrl: 'https://neysa.ai/about-us/',
  officialPrivacyUrl: 'https://neysa.ai/privacy-policy/',
  verifiedSampleJobUrl: 'https://neysa.ai/careers/job-openings/backend-engineer/',
  verifiedPublicJobCount: 12,
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-same-domain-job-openings-page',
  extractionStrategy:
    'verified-first-party-careers-page+verified-same-domain-job-openings-page+detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default NEYSA_CATALOG
