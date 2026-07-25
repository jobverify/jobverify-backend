import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://emudhra.com/en-in/careers is the live India careers page for eMudhra, that https://emudhra.com/en/careers is the linked first-party global careers page, that both careers pages publish their Explore Opportunities and See all openings handoff to https://emudhra.com/en/careers-open-positions, that https://emudhra.com/en/careers-open-positions and https://emudhra.com/en-in/careers-open-positions each return a first-party 404 "Page Not Found" page, and that https://emudhra.com/sitemap.xml publishes the careers route but no openings route. No trustworthy public jobs surface was exposed during live verification.'

export const EMUDHRA_CATALOG = {
  source: 'emudhra',
  companyName: 'eMudhra',
  officialBrandName: 'eMudhra',
  adapter: 'script',
  homepageUrl: 'https://emudhra.com/en-in/',
  companyCareerPage: 'https://emudhra.com/en-in/careers',
  careerPageUrl: 'https://emudhra.com/en-in/careers',
  globalCareerPageUrl: 'https://emudhra.com/en/careers',
  publishedOpeningsUrl: 'https://emudhra.com/en/careers-open-positions',
  checkedBrokenOpeningsUrls: [
    'https://emudhra.com/en/careers-open-positions',
    'https://emudhra.com/en-in/careers-open-positions',
  ],
  sitemapUrl: 'https://emudhra.com/sitemap.xml',
  companyDomain: 'emudhra.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'validated-first-party-careers-pages-plus-broken-openings-routes',
  extractionStrategy:
    'verified-india-careers-page+verified-global-careers-page+verified-broken-openings-routes+verified-sitemap-careers-without-openings+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'emudhra/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default EMUDHRA_CATALOG
