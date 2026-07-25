import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FRESHMENU_CATALOG = {
  source: 'freshmenu',
  companyName: 'FreshMenu',
  adapter: 'script',
  homepageUrl: 'https://www.freshmenu.com/',
  aboutPageUrl: 'https://www.freshmenu.com/about',
  checkedMissingRouteUrls: [
    'https://www.freshmenu.com/careers',
    'https://www.freshmenu.com/jobs',
  ],
  companyDomain: 'freshmenu.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-about-page-plus-missing-career-routes',
  extractionStrategy:
    'verified-homepage-no-careers-link+verified-about-page-no-careers-link+verified-missing-career-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that the live FreshMenu homepage at https://www.freshmenu.com/ exposes ordering, product, and About links but no careers handoff, and that the first-party About page at https://www.freshmenu.com/about describes the brand and publishes the support contacts order@freshmenu.com and grievance@freshmenu.com without exposing a public jobs board. Verified that the obvious public career routes https://www.freshmenu.com/careers and https://www.freshmenu.com/jobs are not live public careers pages on the verified date. No trustworthy public jobs surface is currently available.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default FRESHMENU_CATALOG
