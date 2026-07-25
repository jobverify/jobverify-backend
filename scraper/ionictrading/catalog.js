import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IONIC_TRADING_CATALOG = {
  source: 'ionictrading',
  companyName: 'Ionic Trading',
  adapter: 'script',
  companyCareerPage: 'https://ionic.trade/',
  homepageUrl: 'https://ionic.trade/',
  documentationUrl: 'https://dev.api.ionic.trade/',
  officialBrandName: 'ionic',
  productTagline: 'Solana Trading Infrastructure',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'Global',
  paginationStrategy: 'verified-homepage-plus-adjacent-route-validation',
  extractionStrategy:
    'verified-first-party-homepage-without-linked-public-careers+adjacent-routes-non-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'ionic.trade',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://ionic.trade/ was the live first-party Ionic Trading homepage, exposing product links such as About, View Documentation, Live Demo, and Contact Us together with the copy "Solana Trading Infrastructure" and "Real-time Trading Data for Solana." The trusted first-party page linked documentation to https://dev.api.ionic.trade/ but did not expose or clearly link any trustworthy public careers or jobs surface, so there was no trustworthy public careers or jobs surface verified there. Direct DNS and HTTP probes from this environment to adjacent routes such as https://ionic.trade/about, https://ionic.trade/careers, https://ionic.trade/jobs, and https://ionic.trade/contact did not yield a trustworthy public jobs surface on Friday, July 17, 2026.',
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
