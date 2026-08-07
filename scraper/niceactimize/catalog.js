import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NICE_ACTIMIZE_CATALOG = {
  source: 'niceactimize',
  companyName: 'NICE Actimize',
  officialBrandName: 'NICE Actimize',
  adapter: 'script',
  officialActimizePageUrl: 'https://www.niceactimize.com/get-in-touch',
  companyCareerPage: 'https://www.nice.com/careers/apply?location=India+-+Pune',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/nice/jobs?content=true',
  greenhouseBoardHost: 'boards.eu.greenhouse.io',
  atsPlatform: 'greenhouse-board-api',
  countryFilter: 'India',
  paginationStrategy: 'single-greenhouse-board-feed',
  extractionStrategy:
    'verified-nice-actimize-first-party-handoff+verified-nice-careers-filter-page+greenhouse-board-api+actimize-india-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'nice.com',
  verifiedOn: '2026-08-03',
  verifiedJobCount: 9,
  sampleJobUrl: 'https://boards.eu.greenhouse.io/nice/jobs/4913142101?gh_jid=4913142101',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://www.niceactimize.com/get-in-touch is the live first-party NICE Actimize handoff page and that it routes candidates to NICE careers. The filtered NICE careers surface at https://www.nice.com/careers/apply?location=India+-+Pune now renders a generic "Careers at NiCE" heading with India - Pune selected in the location filter while still exposing Actimize roles in India/Pune, and the public Greenhouse board feed at https://boards-api.greenhouse.io/v1/boards/nice/jobs?content=true yielded 9 India/Pune Actimize roles, including Data Scientist, Actimize.',
  dryRunFile: 'niceactimize/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NICE_ACTIMIZE_CATALOG
