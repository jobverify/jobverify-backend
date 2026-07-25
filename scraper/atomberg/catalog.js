import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://atomberg.com/ is the live first-party Atomberg homepage and links to the first-party careers page at https://atomberg.com/careers, where the current public careers surface is resume-only recruiting copy that asks candidates to share resumes at career@atomberg.com. Also verified that https://atomberg.com/jobs and https://atomberg.com/pages/careers returned first-party Next.js 404 noindex responses, while https://atomberg.com/career returned a first-party 500 Internal Server Error response during live checks. There is no trustworthy public jobs surface for Atomberg right now.'

export const ATOMBERG_CATALOG = {
  source: 'atomberg',
  companyName: 'Atomberg',
  officialBrandName: 'Atomberg',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'atomberg/jobs.json',
  companyCareerPage: 'https://atomberg.com/careers',
  homepageUrl: 'https://atomberg.com/',
  applicationEmail: 'career@atomberg.com',
  applicationUrl: 'mailto:career@atomberg.com',
  noPublicJobRouteUrls: [
    'https://atomberg.com/jobs',
    'https://atomberg.com/pages/careers',
  ],
  brokenCareerRouteUrl: 'https://atomberg.com/career',
  companyDomain: 'atomberg.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-resume-only-careers-page-plus-missing-route-validation',
  extractionStrategy:
    'verified-homepage+verified-careers-page-email-resume-handoff-without-public-listings+verified-missing-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ATOMBERG_CATALOG
