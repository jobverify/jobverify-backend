import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LUMAX_INDUSTRIES_CATALOG = {
  source: 'lumaxindustries',
  companyName: 'Lumax Industries',
  officialBrandName: 'Lumax Industries Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'lumaxindustries/jobs.json',
  companyCareerPage: 'https://www.lumaxworld.in/current-openings.html',
  jobsBoardUrl: 'https://www.lumaxworld.in/current-openings.html',
  officialCompanyPageUrl: 'https://www.lumaxworld.in/lumaxindustries/index.html',
  workWithUsUrl: 'https://www.lumaxworld.in/work-with-us.html',
  companyDomain: 'lumaxworld.in',
  atsPlatform: 'official-company-site-no-live-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'verified-listed-company-page-plus-current-openings-page-plus-work-with-us-form',
  extractionStrategy:
    'verified-listed-company-page+verified-current-openings-page+verified-work-with-us-page+no-live-public-job-cards-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that https://www.lumaxworld.in/lumaxindustries/index.html is the exact first-party Lumax Industries Limited company page, while the official careers surfaces at https://www.lumaxworld.in/current-openings.html and https://www.lumaxworld.in/work-with-us.html exposed no trustworthy public job listings. The current-openings page rendered only an empty openings shell with commented historical vacancy markup, and the work-with-us page exposed a general resume form and springboard email handoff rather than structured public jobs, so this exact-name provider is a fail-closed sentinel that returns no jobs until live first-party listings appear.',
}

export default LUMAX_INDUSTRIES_CATALOG
