import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AVENDATA_CATALOG = {
  source: 'avendata',
  companyName: 'AvenDATA',
  officialBrandName: 'AvenDATA',
  adapter: 'script',
  companyCareerPage: 'https://avendata.com/careers',
  homepageUrl: 'https://avendata.com/',
  careersPageUrl: 'https://avendata.com/careers',
  robotsTxtUrl: 'https://avendata.com/robots.txt',
  sitemapUrl: 'https://avendata.com/sitemap.xml',
  sitemapCareerRouteUrls: ['https://avendata.com/careers'],
  careerAliasRouteUrls: [
    'https://avendata.com/careers/',
    'https://www.avendata.com/careers',
  ],
  noPublicJobRouteUrls: [
    'https://avendata.com/career',
    'https://avendata.com/jobs',
    'https://avendata.com/join-us',
    'https://avendata.com/work-with-us',
    'https://avendata.com/openings',
    'https://avendata.com/current-openings',
    'https://avendata.com/company/careers',
    'https://avendata.com/about/careers',
  ],
  atsPlatform: 'official-company-careers-nonlisting',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-page-plus-robots-sitemap-and-adjacent-route-validation',
  extractionStrategy:
    'verified-homepage+verified-careers-resume-form+verified-robots-txt+verified-single-sitemap-careers-route+missing-adjacent-jobs-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'avendata.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://avendata.com/ is the live first-party AvenDATA homepage and links Careers to https://avendata.com/careers, that the official careers page is currently a general application surface with "Upload Your Resume" and "Submit Application" instead of public job listings, that robots.txt points to https://avendata.com/sitemap.xml which only publishes https://avendata.com/careers as the careers-like route, and that adjacent first-party jobs routes such as /career, /jobs, /join-us, /work-with-us, /openings, /current-openings, /company/careers, and /about/careers returned 404 pages. There is no trustworthy public jobs surface on the AvenDATA domain right now.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AVENDATA_CATALOG
