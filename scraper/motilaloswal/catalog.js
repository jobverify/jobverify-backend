import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, July 16, 2026 that https://www.motilaloswal.com/careers/growth is an official first-party careers page and its View Opportunities link hands candidates to the public TurboHire board at https://motilaloswal.turbohire.co/. The live public noauth TurboHire filtered jobs API for org 0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa returned 47 public jobs on Thursday, July 16, 2026.'

export const MOTILAL_OSWAL_CATALOG = {
  source: 'motilaloswal',
  companyName: 'Motilal Oswal',
  officialBrandName: 'Motilal Oswal Financial Services Ltd',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'motilaloswal/jobs.json',
  homepageUrl: 'https://www.motilaloswal.com/',
  companyCareerPage: 'https://www.motilaloswal.com/careers/growth',
  companyDomain: 'motilaloswal.com',
  handoffBoardUrl: 'https://motilaloswal.turbohire.co/',
  turboHireOrgId: '0f6e3a76-85ff-4b66-8bfa-4cd4fede4ffa',
  verifiedSampleJobUrl:
    'https://motilaloswal.turbohire.co/job/publicjobs/k4EksA%2FVAhabRMx4P%2FoDd4vzfS4iRwbhk_IbeLEYnT1pnLdCG09kgLlCbMt3ghQZ',
  atsPlatform: 'turbohire',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-handoff-plus-public-turbohire-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-turbohire-board+noauth-token+filteredjobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default MOTILAL_OSWAL_CATALOG
