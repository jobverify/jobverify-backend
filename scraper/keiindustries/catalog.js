import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.kei-ind.com/ is the live first-party KEI Industries homepage, https://www.kei-ind.com/career-at-kei/life-at-kei/ is the first-party career landing page, and https://www.kei-ind.com/jobs/ is the public first-party archive that exposes both real openings and non-job posts such as "Our ESG Vision/ Purpose". Also verified that first-party detail pages including https://www.kei-ind.com/jobs/executive/, https://www.kei-ind.com/jobs/design-engineer/, and https://www.kei-ind.com/jobs/business-development-marketing/ carry the expected "Job Features" plus "Apply Online" contract, so this provider enumerates first-party /jobs/ detail links from the archive and keeps only detail pages that validate as actual job postings.'

export const KEI_INDUSTRIES_CATALOG = {
  source: 'keiindustries',
  companyName: 'KEI Industries',
  officialBrandName: 'KEI Industries',
  adapter: 'script',
  companyCareerPage: 'https://www.kei-ind.com/jobs/',
  homepageUrl: 'https://www.kei-ind.com/',
  officialCareerPageUrl: 'https://www.kei-ind.com/career-at-kei/life-at-kei/',
  jobsArchiveUrl: 'https://www.kei-ind.com/jobs/',
  sampleJobDetailUrls: [
    'https://www.kei-ind.com/jobs/executive/',
    'https://www.kei-ind.com/jobs/design-engineer/',
    'https://www.kei-ind.com/jobs/business-development-marketing/',
  ],
  companyDomain: 'kei-ind.com',
  atsPlatform: 'first-party-wordpress-job-pages',
  countryFilter: 'India',
  paginationStrategy: 'first-party-jobs-archive-link-enumeration-with-detail-page-validation',
  extractionStrategy:
    'verified-first-party-jobs-archive+detail-page-job-features-apply-online-validation',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: path.join(currentDir, 'jobs.json'),
  modulePath: path.join(currentDir, 'script.js'),
}

export default KEI_INDUSTRIES_CATALOG
