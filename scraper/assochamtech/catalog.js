import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.assocham.org/ is the live official ASSOCHAM first-party site, that the homepage Careers link resolves to https://www.assocham.org/career.php, and that the careers page is a generic profile and internship intake surface with hr@assocham.com, resume-upload fields, and no trustworthy public jobs surface. Common public job routes such as /careers, /career, /jobs, /join-us, /work-with-us, and /recruitment returned 404 Not Found pages during live checks.'

export const ASSOCHAM_TECH_CATALOG = {
  source: 'assochamtech',
  companyName: 'Assocham Tech',
  officialBrandName: 'ASSOCHAM',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'assochamtech/jobs.json',
  homepageUrl: 'https://www.assocham.org/',
  companyCareerPage: 'https://www.assocham.org/career.php',
  applicationEmail: 'hr@assocham.com',
  applicationUrl: 'mailto:hr@assocham.com',
  companyDomain: 'assocham.org',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-generic-careers-intake-page-plus-common-job-route-404-validation',
  extractionStrategy:
    'verified-homepage+verified-generic-careers-intake-page-without-public-listings+verified-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ASSOCHAM_TECH_CATALOG
