import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 28, 2026 that https://authorstream.com/, https://authorstream.com/careers, https://authorstream.com/career, https://authorstream.com/jobs, https://authorstream.com/about, and https://authorstream.com/contact-us all still serve the same first-party JavaScript redirect shell that sends visitors to /lander. Verified that https://authorstream.com/lander now returns a 307 redirect to the GoDaddy for-sale page for authorstream.com, that https://authorstream.com/robots.txt is still a minimal allow-all crawl file, and that https://authorstream.com/sitemap.xml still lists only https://authorstream.com/lander. There is no trustworthy public jobs surface: the verified first-party domain remains a parked shell rather than a live company careers site or ATS handoff.'

export const AUTHORSTREAM_CATALOG = {
  source: 'authorstream',
  companyName: 'AuthorStream',
  officialBrandName: 'AuthorStream',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'authorstream/jobs.json',
  companyCareerPage: 'https://authorstream.com/',
  homepageUrl: 'https://authorstream.com/',
  robotsTxtUrl: 'https://authorstream.com/robots.txt',
  sitemapUrl: 'https://authorstream.com/sitemap.xml',
  landerUrl: 'https://authorstream.com/lander',
  checkedRouteUrls: [
    'https://authorstream.com/careers',
    'https://authorstream.com/career',
    'https://authorstream.com/jobs',
    'https://authorstream.com/about',
    'https://authorstream.com/contact-us',
  ],
  companyDomain: 'authorstream.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-redirect-shell-plus-robots-sitemap-and-first-party-route-validation',
  extractionStrategy:
    'verified-redirect-shell+verified-robots-and-sitemap-with-single-lander-url+verified-first-party-routes-share-parked-redirect-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-28',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AUTHORSTREAM_CATALOG
