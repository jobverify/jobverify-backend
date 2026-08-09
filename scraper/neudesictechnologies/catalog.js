import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NEUDESIC_TECHNOLOGIES_CATALOG = {
  source: 'neudesictechnologies',
  companyName: 'Neudesic Technologies',
  officialBrandName: 'Neudesic',
  adapter: 'script',
  companyCareerPage: 'https://www.neudesic.com/careers/',
  companyDomain: 'neudesic.com',
  atsPlatform: 'official-company-site-third-party-region-links',
  countryFilter: 'India',
  paginationStrategy: 'single-careers-page-region-link-handoff',
  extractionStrategy: 'verified-first-party-careers-shell+linkedin-region-links+no-first-party-job-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-03',
  verifiedSurfaceSummary:
    'Verified on Monday, August 3, 2026 that https://www.neudesic.com/careers/ remained the live first-party Neudesic careers shell, that its Search India Openings by Region section still hands India visitors to LinkedIn search links, that the page title had shifted to Careers - Neudesic, and that only informational first-party careers subpages such as phishing-scams and lca-notices were linked on the verified page. The verified page does not expose a trustworthy first-party public jobs feed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'neudesictechnologies/jobs.json',
}

export default NEUDESIC_TECHNOLOGIES_CATALOG
