import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SATSURE_CATALOG = {
  source: 'satsure',
  companyName: 'SatSure',
  officialBrandName: 'SatSure Analytics India Pvt Ltd',
  adapter: 'script',
  companyCareerPage: 'https://www.satsure.co/careers/',
  officialCareersPageUrl: 'https://www.satsure.co/careers/',
  officialCareersHandoffUrl: 'https://satsure.keka.com/careers',
  verifiedSampleJobUrl: 'https://satsure.keka.com/careers/jobdetails/30263',
  companyDomain: 'satsure.co',
  atsPlatform: 'keka-handoff-unverifiable',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-page-plus-external-keka-handoff-no-verifiable-public-board',
  extractionStrategy:
    'verified-first-party-careers-page+verified-keka-handoff+historical-public-jobdetail+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.satsure.co/careers/ is the live first-party SatSure careers page and that it publicly hands candidates to https://satsure.keka.com/careers via View Open Positions. Verified also that the Keka host still exposes at least one public SatSure jobdetail URL at https://satsure.keka.com/careers/jobdetails/30263, but the current Keka careers root was not enumerable into a trustworthy current public jobs board from live probes on the verified date. There is no trustworthy public jobs surface for the exact-name SatSure row right now, so this provider fails closed and returns no jobs until SatSure exposes a stable verifiable public Keka listings contract again.',
  dryRunFile: 'satsure/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default SATSURE_CATALOG
