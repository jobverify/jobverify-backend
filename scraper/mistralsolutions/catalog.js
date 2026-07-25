import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const MISTRAL_SOLUTIONS_CATALOG = {
  source: 'mistralsolutions',
  companyName: 'Mistral Solutions',
  officialBrandName: 'Mistral Solutions',
  adapter: 'script',
  companyCareerPage: 'https://mistralsolutions.com/career/careers-job-listings/',
  atsPlatform: 'official-company-careers-table',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-table-page',
  extractionStrategy:
    'verified-first-party-careers-page+html-job-table+docx-detail-links+jotform-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'mistralsolutions.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://mistralsolutions.com/career/careers-job-listings/ remained the live first-party careers page for Mistral Solutions, that it exposed a structured HTML careers table with Bangalore openings including JID-021 Test Engineer - Senior Engineer and JID-001 Pre-Sales Lead - Module Lead/ Project Lead, that View Details linked to first-party DOCX descriptions, and that Apply buttons handed candidates to public Jotform URLs.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'mistralsolutions/jobs.json',
}

export default MISTRAL_SOLUTIONS_CATALOG
