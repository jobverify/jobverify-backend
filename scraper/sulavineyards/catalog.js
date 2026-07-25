import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://sulavineyards.com/careers.php is the live official Sula Vineyards careers page, that it links candidates to https://app.hrone.cloud/career-portal?ccid=8Qqxv4vYEt7A1wqC_2B0Fw~~&payload=evgE4Qh6f3p6GKeiD4fJQ0LiQsj1hT4DjXVao0Cuhy3Gev16iZi3l6M7u3e72Dhi&dc=sula via View Open Positions, that the page still carries Sula Vineyards Limited branding, and that the public HROne handoff only exposed a JavaScript-required shell on the verified date. There is no trustworthy public jobs surface for the exact-name Sula Vineyards row right now, so this provider fails closed and returns no jobs until Sula exposes a stable verifiable public listings contract again.'

export const SULA_VINEYARDS_CATALOG = {
  source: 'sulavineyards',
  companyName: 'Sula Vineyards',
  officialBrandName: 'Sula Vineyards Limited',
  adapter: 'script',
  companyCareerPage: 'https://sulavineyards.com/careers.php',
  officialCareersPageUrl: 'https://sulavineyards.com/careers.php',
  officialCareersHandoffUrl:
    'https://app.hrone.cloud/career-portal?ccid=8Qqxv4vYEt7A1wqC_2B0Fw~~&payload=evgE4Qh6f3p6GKeiD4fJQ0LiQsj1hT4DjXVao0Cuhy3Gev16iZi3l6M7u3e72Dhi&dc=sula',
  companyDomain: 'sulavineyards.com',
  atsPlatform: 'hrone-handoff-unverifiable',
  countryFilter: 'India',
  paginationStrategy: 'official-careers-page-plus-external-hrone-handoff-no-verifiable-public-board',
  extractionStrategy: 'verified-official-careers-page+verified-hrone-handoff+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'sulavineyards/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SULA_VINEYARDS_CATALOG
