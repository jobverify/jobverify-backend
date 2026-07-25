import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ZIFO_RND_SOLUTIONS_CATALOG = {
  source: 'zifo',
  companyName: 'Zifo RnD Solutions',
  officialBrandName: 'Zifo',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'zifo/jobs.json',
  companyCareerPage: 'https://careers.zifo.com/',
  officialCareersPageUrl: 'https://careers.zifo.com/',
  companyDomain: 'careers.zifo.com',
  atsPlatform: 'official-company-careers-no-current-india-vacancies',
  countryFilter: 'India',
  paginationStrategy: 'verified-single-first-party-careers-page-with-no-current-india-vacancies',
  extractionStrategy: 'verified-first-party-careers-page+explicit-no-vacancies-copy-returns-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://careers.zifo.com/ is the live first-party Zifo RnD Solutions careers page, that its Zifo India section still exposes stale role text such as Assistant Manager - Finance, Chennai, and that the same page explicitly says "we do not have any vacancies at this moment," so this provider is pinned as a fail-closed sentinel until a trustworthy public jobs surface reappears.',
}

export default ZIFO_RND_SOLUTIONS_CATALOG
