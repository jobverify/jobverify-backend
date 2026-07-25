import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PAYCOR_CLIENT_ID = '8a7883c6606d030901607ae3719c71a6'

export const ALGONOMY_CATALOG = {
  source: 'algonomy',
  companyName: 'Algonomy',
  officialBrandName: 'Algonomy',
  adapter: 'script',
  companyCareerPage: 'https://www.algonomy.com.br/en/careers/',
  paycorClientId: PAYCOR_CLIENT_ID,
  paycorScriptUrl: `https://recruitingbypaycor.com/career/iframe.action?clientId=${PAYCOR_CLIENT_ID}`,
  paycorBoardUrl: `https://recruitingbypaycor.com/career/CareerHome.action?clientId=${PAYCOR_CLIENT_ID}&parentUrl=https://www.algonomy.com.br/en/careers/`,
  companyDomain: 'algonomy.com.br',
  atsPlatform: 'official-careers-page-embedded-paycor',
  countryFilter: 'Global',
  paginationStrategy: 'first-party-paycor-career-home',
  extractionStrategy: 'verified-first-party-careers-page+embedded-paycor-career-home+visible-grouped-openings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedPublicJobCount: 4,
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.algonomy.com.br/en/careers/ remained the live first-party careers page, that it embedded //recruitingbypaycor.com/career/iframe.action?clientId=8a7883c6606d030901607ae3719c71a6, and that the public Paycor board exposed four visible openings including Database Programmer (DBP) in Bangalore, India.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ALGONOMY_CATALOG
