import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CBNITS_CATALOG = {
  source: 'cbnits',
  companyName: 'CBNITS',
  officialBrandName: 'CBNITS',
  adapter: 'script',
  homepageUrl: 'https://www.cbnits.com/',
  companyCareerPage: 'https://www.cbnits.com/careers',
  atsPlatform: 'first-party-spa-careers-shell-no-public-jobs-html',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-spa-shell-validation',
  extractionStrategy: 'verified-first-party-careers-spa-shell-without-ssr-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cbnits.com',
  verifiedOn: '2026-08-14',
  verifiedSurfaceSummary:
    'Verified on Friday, August 14, 2026 that https://www.cbnits.com/careers is the live first-party CBNITS careers route, and that the raw first-party HTML response remains a client-rendered SPA shell with the title "Agentic AI, Cybersecurity & Intelligent Enterprise Solutions | CBNITS", a current /assets/index-*.js module bundle, and <div id="root"></div> rather than any trustworthy server-rendered public jobs payload.',
  dryRunFile: 'cbnits/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CBNITS_CATALOG
