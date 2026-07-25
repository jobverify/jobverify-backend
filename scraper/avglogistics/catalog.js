import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://avglogistics.com/ is the live first-party AVG Logistics Limited marketing site, that it links to the first-party careers page at https://avglogistics.com/careers, that https://avglogistics.com/robots.txt points crawlers to https://www.avglogistics.com/sitemap.xml, and that the sitemap explicitly includes https://avglogistics.com/careers. Verified the careers page exposes recruiting copy such as "Explore your Future at AVG" and "Easily apply to multiple jobs with one click !" but the advertised jobs container is empty, with no public job cards, no JobPosting markup, no detail pages, and no trustworthy apply links beyond generic contact email addresses. Also verified that https://avglogistics.com/jobs, https://avglogistics.com/job, https://avglogistics.com/current-openings, https://avglogistics.com/openings, https://avglogistics.com/work-with-us, and https://avglogistics.com/join-us returned first-party 404 Page Not Found responses, while https://avglogistics.in/ is a separate operational parcel-tracking/login portal whose https://avglogistics.in/careers route returned a first-party 404. There is no trustworthy public jobs surface for AVG Logistics right now.'

export const AVG_LOGISTICS_CATALOG = {
  source: 'avglogistics',
  companyName: 'AVG Logistics',
  officialBrandName: 'AVG Logistics Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'avglogistics/jobs.json',
  companyCareerPage: 'https://avglogistics.com/careers',
  homepageUrl: 'https://avglogistics.com/',
  robotsTxtUrl: 'https://avglogistics.com/robots.txt',
  sitemapUrl: 'https://www.avglogistics.com/sitemap.xml',
  noPublicJobRouteUrls: [
    'https://avglogistics.com/jobs',
    'https://avglogistics.com/job',
    'https://avglogistics.com/current-openings',
    'https://avglogistics.com/openings',
    'https://avglogistics.com/work-with-us',
    'https://avglogistics.com/join-us',
  ],
  operationsPortalUrl: 'https://avglogistics.in/',
  operationsPortalCareersUrl: 'https://avglogistics.in/careers',
  companyDomain: 'avglogistics.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-static-careers-page-plus-robots-sitemap-and-common-route-validation',
  extractionStrategy:
    'verified-homepage+verified-static-careers-page-without-public-job-cards+verified-robots-and-sitemap+verified-common-job-routes-and-portal-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AVG_LOGISTICS_CATALOG
