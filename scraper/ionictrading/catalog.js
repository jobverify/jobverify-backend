import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IONIC_TRADING_CATALOG = {
  source: 'ionictrading',
  companyName: 'Ionic Trading',
  adapter: 'script',
  companyCareerPage: 'https://ionic.trade/',
  homepageUrl: 'https://ionic.trade/',
  documentationUrl: 'https://dev.api.ionic.trade/docs',
  officialBrandName: 'Ionic',
  productTagline: 'Solana Trading Infrastructure',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'Global',
  paginationStrategy: 'verified-homepage-plus-adjacent-route-validation',
  extractionStrategy:
    'verified-first-party-homepage-without-linked-public-careers+adjacent-routes-non-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'ionic.trade',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://ionic.trade/ was the live first-party Ionic Trading homepage with the title "Ionic - Trading Solutions API", the copy "Solana Trading Infrastructure" and "Real-time Trading Data for Solana", and a View Documentation link to https://dev.api.ionic.trade/docs. The trusted first-party page did not expose or clearly link any trustworthy public careers or jobs surface, so there was no trustworthy public careers or jobs surface verified there. Adjacent routes such as https://ionic.trade/about, https://ionic.trade/careers, https://ionic.trade/jobs, and https://ionic.trade/contact likewise did not yield a trustworthy public jobs surface from this environment on Sunday, August 2, 2026.',
  adjacentRouteUrls: [
    'https://ionic.trade/about',
    'https://ionic.trade/careers',
    'https://ionic.trade/jobs',
    'https://ionic.trade/contact',
  ],
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default IONIC_TRADING_CATALOG
