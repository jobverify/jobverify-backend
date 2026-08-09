import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_JOB_DETAIL_URLS = [
  'https://www.komprise.com/job/software-development-engineer-productivity/',
  'https://www.komprise.com/job/implementation-engineer-2/',
  'https://www.komprise.com/job/technical-support-engineer/',
]

const VERIFIED_SURFACE_SUMMARY =
  'Verified on August 2, 2026 that https://www.komprise.com/careers/ remains the current first-party Komprise careers page and that https://www.komprise.com/job_listing-sitemap.xml remains the authoritative public job URL feed, now publishing software-development-engineer-productivity, implementation-engineer-2, and technical-support-engineer as the live India detail URLs. Verified the current India detail pages still expose the first-party WP Job Manager email apply flow via india_careers@komprise.com.'

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
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default KOMPRISE_CATALOG
