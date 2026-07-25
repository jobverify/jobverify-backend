import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG = {
  source: 'reservebankinformationtechnology',
  companyName: 'Reserve Bank Information Technology',
  officialBrandName: 'ReBIT',
  adapter: 'script',
  homepageUrl: 'https://rebit.org.in/',
  companyCareerPage: 'https://rebit.org.in/careers/',
  careersPortalBaseUrl: 'https://rebithr.darwinbox.in/ms/candidate/careers',
  companyDomain: 'rebit.org.in',
  atsPlatform: 'first-party-careers-page-darwinbox-job-links',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-join-us-page',
  extractionStrategy:
    'verified-first-party-join-us-page+visible-job-cards+darwinbox-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://rebit.org.in/careers/ redirected to the live first-party Join Us page at https://rebit.org.in/join-us.php and that the page rendered visible public job cards linked to the official ReBIT Darwinbox board under https://rebithr.darwinbox.in/ms/candidate/careers. The verified cards included Sr/Lead Engineer Development- Angular, Manager QA (Core Banking System), Lead Cyber Security - CSRA (NGCB), Architect - Threat Hunter, SOC - SIEM Admin Specialist, and Lead - SOC & Blue Teaming.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'reservebankinformationtechnology/jobs.json',
}

export default RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG
