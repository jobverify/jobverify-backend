import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const BRIGOSHA_TECHNOLOGIES_CATALOG = {
  source: 'brigoshatechnologies',
  companyName: 'Brigosha Technologies',
  officialBrandName: 'brigosha Technologies',
  adapter: 'script',
  companyCareerPage: 'https://www.brigosha.com/join-us/',
  officialCareersPageUrl: 'https://www.brigosha.com/join-us/',
  officialCareersHandoffUrl: 'https://login.brigosha.com/',
  companyDomain: 'brigosha.com',
  atsPlatform: 'associate-portal-handoff-unverifiable',
  countryFilter: 'India',
  paginationStrategy: 'join-us-page-plus-js-only-associate-portal',
  extractionStrategy: 'verified-first-party-join-us-page+verified-portal-handoff+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.brigosha.com/join-us/ was the live first-party Brigosha join-us page, that it handed candidates to https://login.brigosha.com/, and that there was no trustworthy public jobs surface on the verified date.',
  dryRunFile: 'brigoshatechnologies/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default BRIGOSHA_TECHNOLOGIES_CATALOG
