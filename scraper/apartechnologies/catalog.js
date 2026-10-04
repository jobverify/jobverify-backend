import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const APAR_TECHNOLOGIES_CATALOG = {
  source: 'apartechnologies',
  companyName: 'Apar Technologies',
  adapter: 'script',
  companyCareerPage: 'https://www.apartechnologies.com/careers/',
  companyDomain: 'apartechnologies.com',
  officialHomepageUrl: 'https://www.apartechnologies.com/',
  usOpeningsPageUrl: 'https://www.apartechnologies.com/job-posting/',
  apacOpeningsPageUrl: 'https://www.apartechnologies.com/apac-2/',
  robotsTxtUrl: 'https://www.apartechnologies.com/robots.txt',
  sitemapIndexUrl: 'https://www.apartechnologies.com/wp-sitemap.xml',
  pageSitemapUrl: 'https://www.apartechnologies.com/wp-sitemap-posts-page-1.xml',
  officialContactEmail: 'sales.apartech@apar.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-homepage-plus-careers-subpages-plus-page-sitemap-plus-missing-common-job-routes',
  extractionStrategy:
    'verified-homepage-careers-link+verified-careers-page+verified-us-and-apac-placeholder-pages+verified-page-sitemap-careers-urls+verified-missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified on October 3, 2026 that https://www.apartechnologies.com/ links to the redesigned first-party page at https://www.apartechnologies.com/careers/. This page has a generic resume upload form but no public job cards or ATS board. The former https://www.apartechnologies.com/job-posting/ route redirects to the careers page and https://www.apartechnologies.com/apac-2/ returns 404. The earlier regional placeholders referred candidates to sales.apartech@apar.com. There is no trustworthy public jobs surface for Apar Technologies.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default APAR_TECHNOLOGIES_CATALOG
