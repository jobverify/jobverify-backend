import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SIGMA_SOLVE_CATALOG = {
  source: 'sigmasolve',
  companyName: 'Sigma Solve',
  officialBrandName: 'Sigma Solve',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sigmasolve/jobs.json',
  officialHomepageUrl: 'https://www.sigmasolve.com/',
  companyCareerPage: 'https://www.sigmasolve.com/who-we-are/openings',
  officialCareersPageUrl: 'https://www.sigmasolve.com/who-we-are/openings',
  verifiedJobDetailUrl:
    'https://www.sigmasolve.com/who-we-are/open-position/content-growth-strategist',
  companyDomain: 'sigmasolve.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'Global',
  verifiedPublicJobCount: 1,
  verifiedSampleJobTitle: 'Content & Growth Strategist',
  paginationStrategy: 'single-first-party-openings-page-plus-same-domain-detail-pages',
  extractionStrategy:
    'verified-first-party-openings-page+same-domain-opening-cards+same-domain-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified on October 3, 2026 that the official openings page exposes one Content & Growth Strategist card. Its same-domain detail page lists United States, Marketing, and Full-time, and links to a live first-party application form for the same job slug.',
}

export default SIGMA_SOLVE_CATALOG
