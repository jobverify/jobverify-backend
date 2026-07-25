import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AVIOTRON_CATALOG = {
  source: 'aviotron',
  companyName: 'Aviotron',
  officialBrandName: 'Aviotron',
  adapter: 'script',
  companyCareerPage: 'https://aviotron.com/',
  homepageUrl: 'https://aviotron.com/',
  robotsTxtUrl: 'https://aviotron.com/robots.txt',
  sitemapUrl: 'https://aviotron.com/sitemap.xml',
  noPublicJobRouteUrls: [
    'https://aviotron.com/careers',
    'https://aviotron.com/career',
    'https://aviotron.com/join-us',
    'https://aviotron.com/work-with-us',
    'https://aviotron.com/openings',
  ],
  untrustedJobRouteUrl: 'https://aviotron.com/jobs',
  companyDomain: 'aviotron.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-placeholder-homepage-plus-robots-and-sitemap-plus-common-careers-route-validation',
  extractionStrategy:
    'verified-launching-soon-homepage+verified-robots-and-sitemap-without-careers+verified-missing-careers-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://aviotron.com/ is the live first-party Aviotron domain and currently renders a GoDaddy-style Launching Soon placeholder with a subscribe form rather than a careers or jobs handoff. During live checks, https://aviotron.com/robots.txt returned a minimal first-party robots file containing only "User-agent: *" and "Disallow: /404", https://aviotron.com/sitemap.xml returned only the first-party pointer http://aviotron.com/sitemap.website.xml, and https://aviotron.com/careers, https://aviotron.com/career, https://aviotron.com/join-us, https://aviotron.com/work-with-us, and https://aviotron.com/openings returned first-party Page Not Found pages. The adjacent https://aviotron.com/jobs route was not trustworthy as it produced 429 and timeout behavior during live probes instead of a stable public listings surface. There is no trustworthy public jobs surface on the first-party Aviotron domain.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AVIOTRON_CATALOG
