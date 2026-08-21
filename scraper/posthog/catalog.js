import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const POSTHOG_CATALOG = {
  source: 'posthog',
  companyName: 'PostHog',
  officialBrandName: 'PostHog',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'posthog/jobs.json',
  companyCareerPage: 'https://posthog.com/careers',
  discoveryCareerPageDataUrl: 'https://posthog.com/page-data/careers/ai-research-engineer/page-data.json',
  companyDomain: 'posthog.com',
  atsPlatform: 'posthog-first-party-gatsby-page-data',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-html-plus-same-domain-gatsby-page-data-current-empty-india-slice',
  extractionStrategy:
    'verified-first-party-careers-page+same-domain-gatsby-page-data+timezone-scan+return-empty-when-no-india-signals',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-21',
  verifiedSurfaceSummary:
    'Verified on Friday, August 21, 2026 that https://posthog.com/careers was the live first-party PostHog careers page, that it exposed same-domain career detail links including /careers/ai-research-engineer, and that the first-party Gatsby page-data endpoint at https://posthog.com/page-data/careers/ai-research-engineer/page-data.json exposed allJobPostings.nodes entries such as AI Research Engineer, Backend Engineer - Ingestion (Europe/UK timezone), Technical Account Executive - EMEA, and Technical Customer Success Manager - Americas with zero India or Bengaluru signals.',
}

export default POSTHOG_CATALOG
