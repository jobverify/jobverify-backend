import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY = 'Verified on Friday, July 17, 2026 that the official STL Tech life and careers page at https://stl.tech/life/ presented the first-party Join us section and linked candidates to the external jobs handoff URL https://stltech.ripplehire.com/candidate/?source=CAREERSITE&token=v0cOTxD3fgZqIF393gqj with the anchor text Apply for your next job here, but did not itself expose a trustworthy enumerable public jobs list or public jobs API on the first-party page. As of the verified date, there is no trustworthy enumerable public jobs surface verified from the first-party careers page, so the local provider intentionally fails closed and returns [].'

export const STERLITE_TECHNOLOGIES_CATALOG = {
  source: 'sterlitetechnologies',
  companyName: 'Sterlite Technologies',
  officialBrandName: 'STL Tech',
  adapter: 'script',
  companyCareerPage: 'https://stl.tech/life/',
  officialCareersPageUrl: 'https://stl.tech/life/',
  linkedJobsPortalUrl: 'https://stltech.ripplehire.com/candidate/?source=CAREERSITE&token=v0cOTxD3fgZqIF393gqj',
  linkedJobsPortalHost: 'stltech.ripplehire.com',
  companyDomain: 'stl.tech',
  atsPlatform: 'official-company-site-no-trustworthy-public-jobs-surface',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-handoff-page',
  extractionStrategy: 'verified-first-party-careers-page+external-ripplehire-handoff+return-empty-when-no-trustworthy-public-jobs-surface',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'sterlitetechnologies/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default STERLITE_TECHNOLOGIES_CATALOG
