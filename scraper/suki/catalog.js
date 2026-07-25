import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.suki.ai/careers/ is the live official Suki careers page, that it sends candidates to the first-party open positions surface at https://www.suki.ai/open-positions/, and that both pages still carry Suki AI, Inc. branding. There is no trustworthy public jobs surface for the exact-name Suki row right now because the live first-party open positions page did not expose a verifiable enumerable current jobs contract from browser probes on the verified date, so this provider fails closed and returns no jobs until Suki exposes a stable public listings surface again.'

export const SUKI_CATALOG = {
  source: 'suki',
  companyName: 'Suki',
  officialBrandName: 'Suki AI, Inc.',
  adapter: 'script',
  companyCareerPage: 'https://www.suki.ai/careers/',
  officialCareersPageUrl: 'https://www.suki.ai/careers/',
  officialCareersHandoffUrl: 'https://www.suki.ai/open-positions/',
  companyDomain: 'suki.ai',
  atsPlatform: 'first-party-open-positions-shell-unverifiable',
  countryFilter: 'Global',
  paginationStrategy:
    'verified-careers-page-plus-first-party-open-positions-shell-no-verifiable-public-board',
  extractionStrategy:
    'verified-first-party-careers-page+verified-first-party-open-positions-shell+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'suki/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SUKI_CATALOG
