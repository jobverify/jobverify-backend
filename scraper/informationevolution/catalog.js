import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INFORMATION_EVOLUTION_CATALOG = {
  source: 'informationevolution',
  companyName: 'Information Evolution',
  adapter: 'script',
  companyCareerPage: 'https://dev.informationevolution.com/jobs/',
  companyDomain: 'dev.informationevolution.com',
  jobsPageUrl: 'https://dev.informationevolution.com/jobs/',
  sampleJobUrl: 'https://dev.informationevolution.com/job/team-leader/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-jobs-page-plus-detail-pages',
  extractionStrategy: 'verified-jobs-page+coimbatore-section+first-party-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://dev.informationevolution.com/jobs/ remained the first-party Information Evolution jobs page, that it publicly listed a Coimbatore, India opening for Team Leader, and that the first-party detail page at https://dev.informationevolution.com/job/team-leader/ exposed the current Employment Type and Job Location sections on the verified date.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'informationevolution/jobs.json',
}

export default INFORMATION_EVOLUTION_CATALOG
