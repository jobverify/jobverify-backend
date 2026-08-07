import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAGNIT_GLOBAL_CATALOG = {
  source: 'magnitglobal',
  companyName: 'Magnit Global',
  officialBrandName: 'Magnit',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://magnitglobal.com/about/careers',
  legacyCareerPageUrl: 'https://magnitglobal.com/us/en/company/careers.html',
  verifiedSampleJobUrl: 'https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL/jobs/7245',
  companyDomain: 'magnitglobal.com',
  atsPlatform: 'dayforce',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-handoff-plus-dayforce-jobposting-search',
  extractionStrategy: 'verified-first-party-careers-page+dayforce-jobposting-search+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dayforceClientNamespace: 'prounlimited',
  dayforceJobBoardCode: 'CANDIDATEPORTAL',
  dayforceJobBoardId: 1,
  dayforceLocale: 'en-US',
  dayforceBaseUrl: 'https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL',
  verifiedOn: '2026-08-03',
  verifiedPublicPostingCount: 25,
  verifiedIndiaRoleCount: 14,
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that the legacy Magnit careers route redirects the live first-party experience to https://magnitglobal.com/about/careers and that its India Learn More handoff resolves to the public Dayforce board at https://jobs.dayforcehcm.com/prounlimited/CANDIDATEPORTAL. Browser-backed verification on the same date confirmed the public Dayforce jobposting search contract returning 25 public postings overall, with 14 India roles after location normalization, including System Administrator - ERP in Bengaluru.',
}

export default MAGNIT_GLOBAL_CATALOG
