import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Saturday, July 18, 2026 that https://maintec.com/jobs/ is the live first-party Maintec jobs archive and that it publicly exposes role cards including CICS System programmer and Associate Engineers (Mechanical or Electrical). The representative CICS detail page currently requires US Eastern hours, while the Associate Engineers detail page now says "This role is no longer available." and the archive cards themselves publish no trustworthy India-localized metadata, so this local provider stays fail-closed until Maintec exposes explicit India job metadata on the first-party archive.'

export const MAINTEC_TECHNOLOGIES_CATALOG = {
  source: 'maintectechnologies',
  companyName: 'Maintec Technologies',
  officialBrandName: 'Maintec',
  adapter: 'script',
  homepageUrl: 'https://maintec.com/',
  companyCareerPage: 'https://maintec.com/jobs/',
  companyDomain: 'maintec.com',
  atsPlatform: 'first-party-jobs-archive-ambiguous-india-location',
  countryFilter: 'India',
  paginationStrategy: 'jobs-archive-plus-representative-detail-validation',
  extractionStrategy:
    'verified-jobs-archive+us-hours-or-expired-detail-pages+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 0,
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'maintectechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default MAINTEC_TECHNOLOGIES_CATALOG
