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
  verifiedOn: '2026-10-03',
  verifiedSurfaceSummary:
    'Verified on October 3, 2026 that https://avendata.com/ remains the first-party AvenDATA homepage and links Careers to https://avendata.com/careers. The refreshed page titles are Decommission Legacy Systems & Archive Data Securely | AvenDATA and Careers at AvenDATA : Archive Legacy Systems & Carve-Outs. The careers page still has Upload Your Resume and Submit Application, with no public job listings. robots.txt still points to https://avendata.com/sitemap.xml, which exposes only the careers route; the two careers aliases resolve to that page and eight adjacent job routes return branded 404 pages. There is no trustworthy public jobs surface on the checked AvenDATA domain.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AVENDATA_CATALOG
