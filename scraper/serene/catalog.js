import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SERENE_CATALOG = {
  source: 'serene',
  companyName: 'Serene',
  officialBrandName: 'Serene Info Solutions Pvt. Ltd.',
  adapter: 'script',
  companyCareerPage: 'https://www.sereneinfosolutions.in/careers/',
  officialCareersPageUrl: 'https://www.sereneinfosolutions.in/careers/',
  officialJobsPageUrl: 'https://www.sereneinfosolutions.in/jobs/',
  officialApplicationPageUrl: 'https://www.sereneinfosolutions.in/join-us/',
  companyDomain: 'sereneinfosolutions.in',
  atsPlatform: 'first-party-html-board',
  countryFilter: 'India',
  paginationStrategy: 'single-public-page',
  extractionStrategy:
    'verified-first-party-careers-page+verified-first-party-jobs-page+shared-first-party-application-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that the official Serene public hiring flow for this exact-name provider was the first-party careers page at https://www.sereneinfosolutions.in/careers/, the public jobs page at https://www.sereneinfosolutions.in/jobs/, and the shared first-party application form at https://www.sereneinfosolutions.in/join-us/. The verified jobs page exposed visible public role cards for Bench Sales Recruiter, Talent Acquisition Associate, Resource Executive, and US IT Recruiter, while the Join Us form handled application intake through one shared first-party submission flow.',
  dryRunFile: 'serene/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SERENE_CATALOG
