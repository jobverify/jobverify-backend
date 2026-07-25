import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://ananthtech.com/ and https://www.ananthtech.com/ both serve the live first-party Ananth Technologies aerospace and defence homepage, that https://ananthtech.com/careers resolves to the first-party careers page at https://ananthtech.com/careers/ with "Join Our Team" recruiting copy and a resume handoff to jobs@ananthtech.com, and that https://ananthtech.com/jobs, https://ananthtech.com/jobs/, https://www.ananthtech.com/jobs, and https://www.ananthtech.com/jobs/ returned 403 Forbidden AccessDenied pages during live checks. There is no trustworthy public jobs surface: the verified careers page is informational recruiting copy without public job cards, public job detail pages, ATS handoff, or structured JobPosting markup.'

export const ANANTH_TECHNOLOGIES_CATALOG = {
  source: 'ananthtechnologies',
  companyName: 'Ananth Technologies',
  officialBrandName: 'Ananth Technologies',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'ananthtechnologies/jobs.json',
  companyCareerPage: 'https://ananthtech.com/careers/',
  careersEntryUrl: 'https://ananthtech.com/careers',
  homepageUrl: 'https://ananthtech.com/',
  applicationEmail: 'jobs@ananthtech.com',
  applicationUrl: 'mailto:jobs@ananthtech.com',
  companyDomain: 'ananthtech.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-resume-only-careers-page-plus-403-job-route-validation',
  extractionStrategy:
    'verified-homepage+verified-careers-page-email-resume-handoff-without-public-listings+verified-403-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ANANTH_TECHNOLOGIES_CATALOG
