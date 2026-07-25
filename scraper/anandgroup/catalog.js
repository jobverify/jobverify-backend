export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.anandgroupindia.com/ is the live official Anand Group homepage, that it hands off to the first-party careers subsection at https://www.anandgroupindia.com/careers-at-anand/, that the informational join-us page at https://www.anandgroupindia.com/careers-at-anand/join-usnew/ and the related shopfloor page at https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/ are live, and that https://www.anandgroupindia.com/page-sitemap.xml lists those same careers subsection URLs. There is no trustworthy public jobs surface: the verified careers pages are employer-branding and culture content without public job cards, role detail pages, ATS handoff, or JobPosting markup, and common first-party job routes such as /careers, /career, /jobs, /join-us, /openings, /current-openings, and /work-with-us returned first-party 404 responses during live checks.'

export const ANAND_GROUP_CATALOG = {
  source: 'anandgroup',
  companyName: 'Anand Group',
  adapter: 'script',
  modulePath: '../anandgroup/script.js',
  companyCareerPage: 'https://www.anandgroupindia.com/careers-at-anand/',
  joinUsPageUrl: 'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
  shopfloorPageUrl: 'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  homepageUrl: 'https://www.anandgroupindia.com/',
  robotsTxtUrl: 'https://www.anandgroupindia.com/robots.txt',
  sitemapIndexUrl: 'https://www.anandgroupindia.com/sitemap_index.xml',
  pageSitemapUrl: 'https://www.anandgroupindia.com/page-sitemap.xml',
  companyDomain: 'anandgroupindia.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-homepage-handoff-plus-careers-subsection-plus-page-sitemap-plus-missing-common-job-routes',
  extractionStrategy:
    'verified-homepage-careers-handoff+verified-careers-and-join-us-pages-without-public-listings+verified-page-sitemap-careers-urls+verified-missing-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  expectedCareerUrlsFromPageSitemap: [
    'https://www.anandgroupindia.com/careers-at-anand/',
    'https://www.anandgroupindia.com/careers-at-anand/join-usnew/',
    'https://www.anandgroupindia.com/careers-at-anand/shopfloor-excellence/',
  ],
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ANAND_GROUP_CATALOG
