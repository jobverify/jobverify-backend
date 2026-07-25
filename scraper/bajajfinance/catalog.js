import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.bajajfinance.com/ redirects to the Bajaj Finserv web property, that https://www.bajajfinserv.in/about-us resolves to https://www.aboutbajajfinserv.com/about-us, and that the Bajaj Finance company page at https://www.aboutbajajfinserv.com/finance-about-us is the live first-party page exposing the Careers handoff to https://bflcareers.peoplestrong.com/. Verified that the public PeopleStrong portal shell at https://bflcareers.peoplestrong.com/ is live and that the public jobs API at https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20 returned live Bajaj Finance listings during verification.'

export const BAJAJ_FINANCE_CATALOG = {
  source: 'bajajfinance',
  companyName: 'Bajaj Finance',
  officialBrandName: 'Bajaj Finance Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'bajajfinance/jobs.json',
  companyCareerPage: 'https://www.aboutbajajfinserv.com/finance-about-us',
  homepageUrl: 'https://www.bajajfinance.com/',
  portalOrigin: 'https://bflcareers.peoplestrong.com',
  jobListingsUrl: 'https://bflcareers.peoplestrong.com/',
  jobsApiUrl: 'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  companyDomain: 'bflcareers.peoplestrong.com',
  atsPlatform: 'peoplestrong',
  countryFilter: 'India',
  paginationStrategy: 'official-bajaj-finance-page-plus-peoplestrong-offset-limit-api',
  extractionStrategy: 'official-bajaj-finance-page+direct-peoplestrong-handoff+peoplestrong-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default BAJAJ_FINANCE_CATALOG
