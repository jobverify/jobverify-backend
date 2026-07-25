import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const NETRACK_CATALOG = {
  source: 'netrack',
  companyName: 'Netrack',
  officialBrandName: 'NetRack Enclosures Private Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.netrackindia.com/en',
  companyCareerPage: 'https://www.netrackindia.com/en',
  contactUrl: 'https://www.netrackindia.com/en/contact-0',
  teamUrl: 'https://www.netrackindia.com/en/about-us/about-company/team',
  blockedRouteUrls: [
    'https://www.netrackindia.com/en',
    'https://www.netrackindia.com/en/contact-0',
    'https://www.netrackindia.com/en/about-us/about-company/team',
    'https://www.netrackindia.com/en/careers',
    'https://www.netrackindia.com/careers',
    'https://www.netrackindia.com/en/jobs',
    'https://www.netrackindia.com/jobs',
  ],
  companyDomain: 'netrackindia.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-blocked-homepage-plus-company-pages-plus-common-careers-route-validation',
  extractionStrategy:
    'verified-blocked-first-party-routes+no-trustworthy-public-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that direct HTTP requests to the official exact-name first-party domain routes https://www.netrackindia.com/en, https://www.netrackindia.com/en/contact-0, and https://www.netrackindia.com/en/about-us/about-company/team returned first-party 403 Access Denied responses rather than a public careers surface. Verified that adjacent common hiring routes https://www.netrackindia.com/en/careers, https://www.netrackindia.com/careers, https://www.netrackindia.com/en/jobs, and https://www.netrackindia.com/jobs also returned the same blocked 403 Access Denied state. There is no trustworthy public jobs surface for Netrack on the verified date.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default NETRACK_CATALOG
