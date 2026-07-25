import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_JOB_DETAIL_URLS = [
  'https://www.komprise.com/job/implementation-engineer-2/',
  'https://www.komprise.com/job/sde2-frontend-engineer/',
  'https://www.komprise.com/job/technical-support-engineer/',
]

const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 16, 2026 that https://www.komprise.com/careers/ is the current first-party Komprise careers page and that https://www.komprise.com/job_listing-sitemap.xml is the authoritative public job URL feed, including same-day updates for technical-support-engineer, sde2-frontend-engineer, and implementation-engineer-2. Verified current India detail pages expose the first-party WP Job Manager apply flow via india_careers@komprise.com.'

export const KOMPRISE_CATALOG = {
  source: 'komprise',
  companyName: 'Komprise',
  officialBrandName: 'Komprise',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  homepageUrl: 'https://www.komprise.com/',
  companyCareerPage: 'https://www.komprise.com/careers/',
  sitemapIndexUrl: 'https://www.komprise.com/sitemap_index.xml',
  jobListingSitemapUrl: 'https://www.komprise.com/job_listing-sitemap.xml',
  verifiedJobDetailUrls: VERIFIED_JOB_DETAIL_URLS,
  companyDomain: 'komprise.com',
  atsPlatform: 'wp-job-manager',
  countryFilter: 'India',
  paginationStrategy: 'verified-careers-page-plus-yoast-job-listing-sitemap',
  extractionStrategy: 'verified-careers-page+job-listing-sitemap+wp-job-manager-detail-pages+india-role-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KOMPRISE_CATALOG
