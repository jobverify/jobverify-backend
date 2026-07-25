import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NATIONAL_INSTRUMENTS_CATALOG = {
  source: 'nationalinstruments',
  companyName: 'National Instruments',
  officialBrandName: 'NI',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.ni.com/',
  companyCareerPage: 'https://www.ni.com/en/about-ni/careers.html',
  companyDomain: 'ni.com',
  oracleCandidateExperienceUrl:
    'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions',
  oracleCandidateExperienceRootUrl:
    'https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1',
  listingApiUrl:
    'https://pef.fa.us1.oraclecloud.com/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList.secondaryLocations&finder=findReqs;siteNumber=CX_1,limit=5,offset=0,location=India',
  acceptedCareerPageStatuses: [503],
  atsPlatform: 'official-company-careers-unavailable',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-linked-oracle-unavailable-validation',
  extractionStrategy: 'verified-first-party-careers-page+linked-oracle-503-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.ni.com/en/about-ni/careers.html is the live first-party NI careers page, that it publicly links candidates to the Oracle Candidate Experience requisitions page at https://pef.fa.us1.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/requisitions, and that the linked Oracle requisitions page, board root, and public requisitions API each returned HTTP 503 Service Unavailable responses from the public surface during verification. The scraper therefore returns an empty array until the linked public jobs board recovers.',
}

export default NATIONAL_INSTRUMENTS_CATALOG
