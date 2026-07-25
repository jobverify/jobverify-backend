import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QUICK_HEAL_CATALOG = {
  source: 'quickheal',
  companyName: 'Quick Heal',
  adapter: 'script',
  companyCareerPage: 'https://www.quickheal.com/jobs-careers-at-quick-heal',
  companyDomain: 'quickheal.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-careers-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  officialCareersHandoffUrl: 'https://lifecycleqhtl.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://lifecycleqhtl.darwinbox.in',
  darwinboxCompanyId: 'main',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.quickheal.com/jobs-careers-at-quick-heal is the live first-party Quick Heal careers page and that it explicitly links job seekers to the official Darwinbox handoff at https://lifecycleqhtl.darwinbox.in/ms/candidate/careers via the visible Apply for a job and Join Our Innovative Team calls-to-action.',
  dryRunFile: 'quickheal/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default QUICK_HEAL_CATALOG
