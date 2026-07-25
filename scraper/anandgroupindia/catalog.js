import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ANAND_GROUP_INDIA_CATALOG = {
  source: 'anandgroupindia',
  companyName: 'Anand Group India',
  officialBrandName: 'ANAND Group',
  adapter: 'script',
  companyCareerPage: 'https://www.anandgroupindia.com/careers-at-anand/',
  joinUsPageUrl: 'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
  shopfloorPageUrl: 'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  homepageUrl: 'https://www.anandgroupindia.com/',
  robotsTxtUrl: 'https://www.anandgroupindia.com/robots.txt',
  sitemapIndexUrl: 'https://www.anandgroupindia.com/sitemap_index.xml',
  pageSitemapUrl: 'https://www.anandgroupindia.com/page-sitemap.xml',
  expectedCareerUrlsFromPageSitemap: [
    'https://www.anandgroupindia.com/careers-at-anand/',
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  ],
  companyDomain: 'anandgroupindia.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-homepage-handoff-plus-careers-subsection-plus-page-sitemap-plus-missing-common-job-routes',
  extractionStrategy:
    'verified-homepage-careers-handoff+verified-careers-and-join-us-pages-without-public-listings+verified-page-sitemap-careers-urls+verified-missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.anandgroupindia.com/ links Careers at ANAND to the live first-party careers subsection at https://www.anandgroupindia.com/careers-at-anand/, that https://www.anandgroupindia.com/careers-at-anand/join-usnew/ remains a marketing-only Join Us page, and that https://www.anandgroupindia.com/page-sitemap.xml lists the first-party careers URLs. There is no trustworthy public jobs surface: the careers tree exposes culture and people-development content plus a recruitment-fraud disclaimer, while the Join Us page shows a generic CLICK TO JOIN CTA and share/newsletter forms without public role cards, ATS handoffs, or job-detail pages. Common first-party job routes such as /careers, /jobs, /join-us, /openings, /current-openings, and /work-with-us returned 404 on July 15, 2026.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ANAND_GROUP_INDIA_CATALOG
