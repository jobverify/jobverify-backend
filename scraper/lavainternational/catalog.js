import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Monday, August 17, 2026 that https://www.lavamobiles.com/aboutus is Lava International Limited\'s live first-party about page, that https://www.lavamobiles.com/career is the live first-party careers landing page, that https://www.lavamobiles.com/career/joblist is the live first-party application page, and that the first-party JSON endpoint https://www.lavamobiles.com/api/openpositionlist returned [] on the verified date. Because the public job-list API is currently empty and the corporate pages expose no trustworthy structured public job listings, this provider returns an empty verified slice.'

export const LAVA_INTERNATIONAL_CATALOG = {
  source: 'lavainternational',
  companyName: 'Lava International',
  officialBrandName: 'Lava International Limited',
  adapter: 'script',
  homepageUrl: 'https://www.lavamobiles.com/',
  aboutPageUrl: 'https://www.lavamobiles.com/aboutus',
  companyCareerPage: 'https://www.lavamobiles.com/career',
  applicationEmail: null,
  applicationUrl: 'https://www.lavamobiles.com/career/joblist',
  companyDomain: 'lavamobiles.com',
  atsPlatform: 'official-company-site-openposition-api',
  countryFilter: 'India',
  paginationStrategy: 'verified-about-page-plus-careers-landing-plus-joblist-plus-empty-openposition-api',
  extractionStrategy: 'verified-about-page+verified-careers-landing+verified-joblist-page+empty-openposition-api-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-17',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'lavainternational/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default LAVA_INTERNATIONAL_CATALOG
