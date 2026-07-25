import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NEXVAL_INFOTECH_CATALOG = {
  source: 'nexvalinfotech',
  companyName: 'Nexval Infotech',
  officialBrandName: 'Nexval',
  adapter: 'script',
  homepageUrl: 'https://www.nexval.ai/',
  companyCareerPage: 'https://www.nexval.ai/careers/',
  legacyCareerPageUrl: 'https://nexval.com/careers/',
  companyDomain: 'nexval.ai',
  atsPlatform: 'no-public-jobs-surface',
  countryFilter: 'Global',
  paginationStrategy: 'fail-closed-no-current-careers-surface',
  extractionStrategy: 'verified-current-homepage+careers-routes-404+legacy-careers-redirect-404+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.nexval.ai/ was the live official Nexval homepage, that https://www.nexval.ai/careers/, https://www.nexval.ai/career/, https://www.nexval.ai/jobs/, and https://www.nexval.ai/join-us/ returned Page not found responses, and that the legacy route https://nexval.com/careers/ redirected to the same 404 on nexval.ai. Search results still exposed stale historical nexval.com careers content, but the live official domain no longer publishes a trustworthy public jobs surface.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default NEXVAL_INFOTECH_CATALOG
