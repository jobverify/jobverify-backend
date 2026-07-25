import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IN_TIME_TEC_VISIONSOFT_CATALOG = {
  source: 'intimetecvisionsoft',
  companyName: 'In Time Tec Visionsoft',
  officialBrandName: 'In Time Tec',
  adapter: 'script',
  homepageUrl: 'https://www.intimetec.com/',
  companyCareerPage: 'https://www.intimetec.com/careers',
  indiaJobsUrl: 'https://careers.intimetec.in/intimetec/jobslist',
  companyDomain: 'intimetec.com',
  atsPlatform: 'first-party-careers-page-plus-blocked-india-board',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-plus-blocked-india-board',
  extractionStrategy:
    'verified-first-party-careers-page+india-careers-handoff+environment-blocked-board-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.intimetec.com/careers is the live first-party In Time Tec careers page and that it repeatedly links India Careers to https://careers.intimetec.in/intimetec/jobslist. Search verification showed that the first-party India board exists, but direct retrieval of the linked board was blocked from this environment, so this local provider stays fail-closed until the India jobs surface is directly enumerable.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'intimetecvisionsoft/jobs.json',
}

export default IN_TIME_TEC_VISIONSOFT_CATALOG
