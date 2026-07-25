import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, July 17, 2026 that https://www.splashlearn.com/careers is the live official SplashLearn careers page, that it presents SplashLearn overview, culture, founder, and support contact content including help@splashlearn.com, and that the accessible first-party page content still ends with StudyPad, Inc. trademark language. There is no trustworthy public jobs surface for the exact-name SplashLearn row right now because the accessible first-party careers page did not expose a trustworthy public jobs board or job-detail route on the verified date, so this provider fails closed and returns no jobs until SplashLearn publishes a stable verifiable jobs surface.'

export const SPLASHLEARN_CATALOG = {
  source: 'splashlearn',
  companyName: 'SplashLearn',
  officialBrandName: 'SplashLearn',
  adapter: 'script',
  companyCareerPage: 'https://www.splashlearn.com/careers',
  officialCareersPageUrl: 'https://www.splashlearn.com/careers',
  companyDomain: 'splashlearn.com',
  atsPlatform: 'official-careers-page-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'single-verified-careers-page-no-public-jobs-surface',
  extractionStrategy: 'verified-official-careers-page+no-public-jobs-signal+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'splashlearn/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SPLASHLEARN_CATALOG
