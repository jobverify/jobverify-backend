import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FLEETX_CATALOG = {
  source: 'fleetx',
  companyName: 'Fleetx',
  officialBrandName: 'Fleetx',
  adapter: 'script',
  homepageUrl: 'https://fleetx.io/',
  wwwHomepageUrl: 'https://www.fleetx.io/',
  companyCareerPage: 'https://fleetx.io/careers',
  wwwCareerPageUrl: 'https://www.fleetx.io/careers',
  robotsUrl: 'https://fleetx.io/robots.txt',
  wwwRobotsUrl: 'https://www.fleetx.io/robots.txt',
  sitemapUrl: 'https://fleetx.io/sitemap.xml',
  wwwSitemapUrl: 'https://www.fleetx.io/sitemap.xml',
  timeoutProbeUrls: [
    'https://fleetx.io/',
    'https://www.fleetx.io/',
    'https://fleetx.io/careers',
    'https://www.fleetx.io/careers',
    'https://fleetx.io/career',
    'https://www.fleetx.io/career',
    'https://fleetx.io/jobs',
    'https://www.fleetx.io/jobs',
    'https://fleetx.io/join-us',
    'https://www.fleetx.io/join-us',
    'https://fleetx.io/work-with-us',
    'https://www.fleetx.io/work-with-us',
    'https://fleetx.io/robots.txt',
    'https://www.fleetx.io/robots.txt',
    'https://fleetx.io/sitemap.xml',
    'https://www.fleetx.io/sitemap.xml',
  ],
  companyDomain: 'fleetx.io',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-first-party-home-careers-and-discovery-route-timeout-validation',
  extractionStrategy:
    'verified-homepage-timeouts+verified-careers-route-timeouts+verified-robots-and-sitemap-timeouts-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that direct first-party fetches to https://fleetx.io/, https://www.fleetx.io/, https://fleetx.io/careers, https://www.fleetx.io/careers, https://fleetx.io/career, https://www.fleetx.io/career, https://fleetx.io/jobs, https://www.fleetx.io/jobs, https://fleetx.io/join-us, https://www.fleetx.io/join-us, https://fleetx.io/work-with-us, https://www.fleetx.io/work-with-us, https://fleetx.io/robots.txt, https://www.fleetx.io/robots.txt, https://fleetx.io/sitemap.xml, and https://www.fleetx.io/sitemap.xml all timed out from the verified environment instead of exposing a reachable first-party homepage, careers shell, sitemap, robots file, ATS handoff, or public jobs listing. No trustworthy public jobs surface was verifiable for Fleetx on the first-party domain at the verified date.',
  dryRunFile: 'fleetx/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default FLEETX_CATALOG
