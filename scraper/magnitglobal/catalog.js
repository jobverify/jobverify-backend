import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MAGNIT_GLOBAL_CATALOG = {
  source: 'magnitglobal',
  companyName: 'Magnit Global',
  officialBrandName: 'Magnit',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://magnitglobal.com/us/en/company/careers.html',
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
  dayforceBaseUrl: 'https://jobs.dayforcehcm.com/en-US/prounlimited/CANDIDATEPORTAL',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://magnitglobal.com/us/en/company/careers.html is the live first-party Magnit careers page and that its India Search Careers handoff resolves to the public Dayforce board at https://jobs.dayforcehcm.com/en-US/prounlimited/CANDIDATEPORTAL. Browser-backed verification on the same date confirmed the public Dayforce jobposting search contract returning live postings, including India roles such as Analyst, Accounts Payable in Vadodara.',
}

export default MAGNIT_GLOBAL_CATALOG
