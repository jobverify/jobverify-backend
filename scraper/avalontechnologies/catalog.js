export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.avalontec.com/ is the live official Avalon Technologies homepage, that it links to the first-party careers page at https://www.avalontec.com/careers/, and that the careers page is a resume-upload form headed "Post your Resume" rather than a public listings board. The live crawl surfaces at https://www.avalontec.com/robots.txt and https://www.avalontec.com/sitemap.xml include the careers page but do not expose public jobs URLs, while https://www.avalontec.com/career/ redirects back to https://www.avalontec.com/careers/. There is no trustworthy public jobs surface: adjacent routes such as https://www.avalontec.com/jobs/, https://www.avalontec.com/openings/, https://www.avalontec.com/current-openings/, https://www.avalontec.com/job1/, and https://www.avalontec.com/job2/ returned broken first-party 302 redirects to https://www.www.avalontec.com/... during live checks.'

export const AVALON_TECHNOLOGIES_CATALOG = {
  source: 'avalontechnologies',
  companyName: 'Avalon Technologies',
  adapter: 'script',
  modulePath: '../../scraper/avalontechnologies/script.js',
  companyCareerPage: 'https://www.avalontec.com/careers/',
  homepageUrl: 'https://www.avalontec.com/',
  careerAliasUrl: 'https://www.avalontec.com/career/',
  robotsTxtUrl: 'https://www.avalontec.com/robots.txt',
  sitemapUrl: 'https://www.avalontec.com/sitemap.xml',
  companyDomain: 'avalontec.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-careers-form-plus-crawl-surface-plus-broken-common-job-routes',
  extractionStrategy:
    'verified-homepage+verified-careers-form-without-public-listings+verified-robots-and-sitemap-without-jobs-urls+verified-broken-common-job-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default AVALON_TECHNOLOGIES_CATALOG

