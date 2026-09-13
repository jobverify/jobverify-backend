import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CBNITS_CATALOG = {
  source: 'cbnits',
  companyName: 'CBNITS',
  officialBrandName: 'CBNITS',
  adapter: 'script',
  homepageUrl: 'https://www.cbnits.com/',
  companyCareerPage: 'https://cbnits.com/',
  atsPlatform: 'first-party-spa-careers-shell-no-public-jobs-html',
  countryFilter: 'India',
  paginationStrategy: 'first-party-spa-shell-and-careers-bundle-validation',
  extractionStrategy: 'verified-first-party-spa-shell+current-careers-route-bundle-without-rendered-jobs',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'cbnits.com',
  verifiedOn: '2026-09-13',
  verifiedSurfaceSummary:
    'Verified on Sunday, September 13, 2026 that direct requests to the client-side /career route return HTTP 404, while https://cbnits.com/ serves the current first-party CBNITS SPA shell titled "Agentic AI, Cybersecurity & Intelligent Enterprise Solutions | CBNITS" with <div id="root"></div>. Its current /assets/index-*.js bundle still defines the /career route, CBNITS careers identity, and the getAllCareerPost request, but the route does not render the returned legacy 2022 records as current public job cards. The provider therefore validates both the official SPA shell and current careers bundle before returning an empty public inventory.',
  dryRunFile: 'cbnits/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default CBNITS_CATALOG
