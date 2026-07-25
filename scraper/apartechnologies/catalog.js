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
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.apartechnologies.com/ is the live first-party homepage for Apar Technologies and links Careers to https://www.apartechnologies.com/careers/. The first-party careers shell links US Openings to https://www.apartechnologies.com/job-posting/ and APAC Openings to https://www.apartechnologies.com/apac-2/, but both regional pages are placeholder Job Listing surfaces that only direct candidates to sales.apartech@apar.com and do not expose trustworthy public job cards, ATS handoffs, or job-detail pages. https://www.apartechnologies.com/wp-sitemap-posts-page-1.xml lists the three first-party careers URLs, while common first-party job routes such as /jobs, /join-us, /work-with-us, /openings, and /current-openings returned 404 on July 15, 2026. There is no trustworthy public jobs surface for Apar Technologies.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default APAR_TECHNOLOGIES_CATALOG
