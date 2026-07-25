import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RAILTEL_CATALOG = {
  source: 'railtel',
  companyName: 'RailTel',
  officialBrandName: 'RailTel',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'railtel/jobs.json',
  companyCareerPage: 'https://www.railtel.in/current-job-openings.html',
  officialCareersHubUrl: 'https://www.railtel.in/career.html',
  companyDomain: 'railtel.in',
  currentOpeningsTitle: 'Current Job Openings',
  verifiedSampleJobTitle:
    'DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi',
  verifiedSampleApplyTitle: 'Click here to apply',
  atsPlatform: 'official-current-openings-page',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-current-openings-page',
  extractionStrategy:
    'verified-first-party-current-openings-page+inline-vacancy-tables+first-party-pdf-notices+optional-digialm-apply',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.railtel.in/current-job-openings.html is the live official RailTel current openings page and exposes first-party vacancy tables for roles including DEPUTATION/Re-employment for 1 post of Junior Translator/ E-0 at Corporate Office, Delhi, DEPUTATION for 1 post of Deputy Manager/Manager (E-1, E-2) at Prayagraj, Northern Region, and current recruitment notices that include Detailed Vacancy Notice No. RCIL/2025/P&A/44/3 plus the Digialm apply handoff. During live checks, Node default HTTPS validation failed on the official host with UNABLE_TO_VERIFY_LEAF_SIGNATURE, so the scraper uses a narrow first-party TLS fallback while staying on the verified RailTel domain.',
}

export default RAILTEL_CATALOG
