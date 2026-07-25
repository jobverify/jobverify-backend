import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KOTAK_SECURITIES_CATALOG = {
  source: 'kotaksecurities',
  companyName: 'Kotak Securities',
  officialBrandName: 'Kotak Securities',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'kotaksecurities/jobs.json',
  homepageUrl: 'https://www.kotaksecurities.com/',
  verifiedBrandHomepageRedirectUrl: 'https://www.kotakneo.com/',
  companyCareerPage: 'https://www.kotakneo.com/about-us/careers/',
  officialCareersHandoffUrl: 'https://kotaksecurities.darwinbox.in/ms/candidate/careers/',
  darwinboxOrigin: 'https://kotaksecurities.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'kotaksecurities.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'official-careers-page+darwinbox-listing-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.kotaksecurities.com/ redirects to the live first-party brand homepage at https://www.kotakneo.com/, that the first-party careers page at https://www.kotakneo.com/about-us/careers/ explicitly directs candidates to the official Darwinbox handoff at https://kotaksecurities.darwinbox.in/ms/candidate/careers/, and that the public Darwinbox shell resolves to the Kotak Securities candidate portal for current openings.',
}

export default KOTAK_SECURITIES_CATALOG
