import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PAYCOR_CLIENT_ID = '8a7883c6606d030901607ae3719c71a6'

export const ALGONOMY_CATALOG = {
  source: 'algonomy',
  companyName: 'Algonomy',
  officialBrandName: 'Algonomy',
  adapter: 'script',
  companyCareerPage: 'https://algonomy.com/careers/',
  paycorClientId: PAYCOR_CLIENT_ID,
  paycorScriptUrl: `https://recruitingbypaycor.com/career/iframe.action?clientId=${PAYCOR_CLIENT_ID}`,
  paycorBoardUrl: `https://recruitingbypaycor.com/career/CareerHome.action?clientId=${PAYCOR_CLIENT_ID}&parentUrl=https://algonomy.com/careers/`,
  companyDomain: 'algonomy.com',
  atsPlatform: 'official-careers-page-embedded-paycor',
  countryFilter: 'Global',
  paginationStrategy: 'first-party-paycor-career-home',
  extractionStrategy: 'verified-first-party-careers-page+embedded-paycor-career-home+visible-grouped-openings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-01',
  verifiedPublicJobCount: 4,
  verifiedSurfaceSummary:
    'Verified on Saturday, August 1, 2026 that Algonomy migrated its live first-party careers page to https://algonomy.com/careers/, that the legacy https://www.algonomy.com.br/en/careers/ route now serves only a JavaScript redirect wall, and that the public Paycor board at parentUrl=https://algonomy.com/careers/ still exposed four visible openings including Senior Database Developer in Oklahoma City, Oklahoma.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ALGONOMY_CATALOG
