import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GROUPON_CATALOG = {
  source: 'groupon',
  companyName: 'Groupon',
  officialBrandName: 'Groupon',
  adapter: 'script',
  companyCareerPage: 'https://www.grouponcareers.com/',
  officialCareersLandingUrl: 'https://www.grouponcareers.com/',
  officialJobsBoardUrl: 'https://job-boards.eu.greenhouse.io/groupon',
  greenhouseJobsApiUrl: 'https://boards-api.greenhouse.io/v1/boards/groupon/jobs',
  greenhouseJobBaseUrl: 'https://job-boards.eu.greenhouse.io/groupon/jobs',
  sampleJobUrl: 'https://job-boards.eu.greenhouse.io/groupon/jobs/4924951101',
  companyDomain: 'grouponcareers.com',
  atsPlatform: 'greenhouse',
  paginationStrategy: 'single-greenhouse-jobs-api-content-page',
  extractionStrategy:
    'verified-first-party-careers-page+official-greenhouse-board-link+visible-greenhouse-board-jobs+greenhouse-jobs-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedJobCount: 13,
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.grouponcareers.com/ is Groupon\'s live first-party careers landing page and that it links directly to the official public Greenhouse board at https://job-boards.eu.greenhouse.io/groupon. Anonymous verification showed the board page exposing 13 visible public job links, and the Greenhouse jobs API at https://boards-api.greenhouse.io/v1/boards/groupon/jobs?content=true returned 13 public jobs including (AI-First) Engineering Manager and Business Development Manager with absolute URLs on the same official Greenhouse board host.',
  dryRunFile: 'groupon/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default GROUPON_CATALOG
