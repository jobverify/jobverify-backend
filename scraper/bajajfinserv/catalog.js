import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.bajajfinserv.in/ is the live Bajaj Finserv consumer web property, that https://www.aboutbajajfinserv.com/about-us is the live first-party Bajaj Finserv corporate about page, and that this first-party corporate page currently exposes the Careers handoff https://bflcareers.peoplestrong.com/home. Verified that the exact /home handoff returns a 404 Candidate Portal shell, while the same public PeopleStrong origin is live at https://bflcareers.peoplestrong.com/ and its public jobs API at https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20 returned live Bajaj Finserv-group listings during verification.'

export const BAJAJ_FINSERV_CATALOG = {
  source: 'bajajfinserv',
  companyName: 'Bajaj Finserv',
  officialBrandName: 'Bajaj Finserv Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'bajajfinserv/jobs.json',
  companyCareerPage: 'https://www.aboutbajajfinserv.com/about-us',
  homepageUrl: 'https://www.bajajfinserv.in/',
  portalOrigin: 'https://bflcareers.peoplestrong.com',
  officialCareersHandoffUrl: 'https://bflcareers.peoplestrong.com/home',
  jobListingsUrl: 'https://bflcareers.peoplestrong.com/',
  jobsApiUrl: 'https://bflcareers.peoplestrong.com/api/cp/rest/altone/cp/jobs/v1?offset=0&limit=20',
  companyDomain: 'bflcareers.peoplestrong.com',
  atsPlatform: 'peoplestrong',
  countryFilter: 'India',
  paginationStrategy: 'official-bajaj-finserv-homepage-plus-peoplestrong-offset-limit-api',
  extractionStrategy:
    'official-bajaj-finserv-homepage+first-party-home-link-to-peoplestrong-home+live-peoplestrong-root-shell+peoplestrong-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default BAJAJ_FINSERV_CATALOG
