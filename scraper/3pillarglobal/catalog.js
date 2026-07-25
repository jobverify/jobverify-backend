import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const THREE_PILLAR_GLOBAL_CATALOG = {
  source: '3pillarglobal',
  companyName: '3Pillar Global',
  officialBrandName: '3Pillar',
  adapter: 'script',
  homepageUrl: 'https://www.3pillar.ai/',
  companyCareerPage: 'https://www.3pillar.ai/careers/career-opportunities/',
  officialLeverBoardUrl: 'https://jobs.lever.co/3pillarglobal',
  leverApiUrl: 'https://api.lever.co/v0/postings/3pillarglobal?mode=json',
  companyDomain: '3pillar.ai',
  atsPlatform: 'lever',
  countryFilter: 'Global',
  paginationStrategy: 'verified-first-party-careers-page-plus-lever-api',
  extractionStrategy:
    'verified-first-party-careers-page+verified-official-lever-board+global-lever-postings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 92,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026: https://www.3pillar.ai/careers/career-opportunities/ resolved with the public 3Pillar Career Opportunities page, https://jobs.lever.co/3pillarglobal resolved with the official 3Pillar Lever board, and https://api.lever.co/v0/postings/3pillarglobal?mode=json returned 92 public postings.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default THREE_PILLAR_GLOBAL_CATALOG
