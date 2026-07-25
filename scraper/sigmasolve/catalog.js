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
    'https://www.sigmasolve.com/who-we-are/open-position/ai-driven-lead-generation-amp-email-marketing-specialist',
  companyDomain: 'sigmasolve.com',
  atsPlatform: 'official-company-careers',
  countryFilter: 'Global',
  verifiedPublicJobCount: 1,
  verifiedSampleJobTitle: 'AI-Driven Lead Generation & Email Marketing Specialist',
  paginationStrategy: 'single-first-party-openings-page-plus-same-domain-detail-pages',
  extractionStrategy:
    'verified-first-party-openings-page+same-domain-opening-cards+same-domain-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.sigmasolve.com/who-we-are/openings is the live exact-name Sigma Solve public openings page, that it exposes one same-domain opening card for AI-Driven Lead Generation & Email Marketing Specialist, and that the linked first-party detail route at https://www.sigmasolve.com/who-we-are/open-position/ai-driven-lead-generation-amp-email-marketing-specialist is live. Verified also that the older route https://www.sigmasolve.com/careers returned 404 on the same date, so this provider is anchored on the newer first-party openings surface.',
}

export default SIGMA_SOLVE_CATALOG
