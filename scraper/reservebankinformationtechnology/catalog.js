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
  careersPortalBaseUrl: 'https://rebithr.darwinbox.in/ms/candidatev2/main/careers/',
  companyDomain: 'rebit.org.in',
  atsPlatform: 'first-party-careers-spa-authenticated-api',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-current-openings-api',
  extractionStrategy:
    'verified-first-party-careers-spa+authenticated-current-openings-api+darwinbox-apply-links+experience-field',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-05',
  verifiedSurfaceSummary:
    'Verified on Wednesday, August 5, 2026 that https://rebit.org.in/careers/ is the live first-party ReBIT careers SPA, that the page bootstraps a public anonymous API login handshake at https://rebit.org.in/web/api/auth/login, and that the authenticated first-party openings feed at https://rebit.org.in/web/api/current-openings returned 26 active openings with direct ReBIT Darwinbox apply links under https://rebithr.darwinbox.in/ms/candidatev2/main/careers/. The verified openings included Data Science Manager, AI/ML Architect, Company Secretary, Engineer - IT Infra, Lead - Application Security SSDLC, Incident Response and Governance - Specialist, and SOC - SIEM Admin Specialist, and the feed exposed explicit job_experience values for all 26 current openings.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'reservebankinformationtechnology/jobs.json',
}

export default RESERVE_BANK_INFORMATION_TECHNOLOGY_CATALOG
