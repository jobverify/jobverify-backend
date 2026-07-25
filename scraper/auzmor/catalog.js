import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AUZMOR_CATALOG = {
  source: 'auzmor',
  companyName: 'Auzmor',
  officialBrandName: 'Auzmor',
  adapter: 'script',
  companyCareerPage: 'https://auzmor.com/careers/',
  homepageUrl: 'https://auzmor.com/',
  careersPageUrl: 'https://auzmor.com/careers/',
  pageSitemapUrl: 'https://auzmor.com/page-sitemap.xml',
  sitemapCareerRouteUrls: ['https://auzmor.com/careers/'],
  careerAliasRouteUrls: ['https://auzmor.com/career'],
  noPublicJobRouteUrls: [
    'https://auzmor.com/jobs',
    'https://auzmor.com/join-us',
    'https://auzmor.com/work-with-us',
    'https://auzmor.com/openings',
    'https://auzmor.com/current-openings',
    'https://auzmor.com/company/careers',
    'https://auzmor.com/about/careers',
  ],
  atsPlatform: 'official-company-careers-nonlisting',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-page-plus-sitemap-and-adjacent-route-validation',
  extractionStrategy:
    'verified-homepage+verified-careers-marketing-page+verified-page-sitemap-single-careers-route+missing-adjacent-jobs-routes-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'auzmor.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://auzmor.com/ is the live first-party homepage and links Careers to https://auzmor.com/careers/. The careers page is live at https://auzmor.com/careers/ but currently serves Auzmor Hire product-marketing content titled "Auzmor Hire - Powerfully Integrating Your ATS & Careers Page" rather than a public jobs board. https://auzmor.com/page-sitemap.xml lists only the single career-like route https://auzmor.com/careers/, https://auzmor.com/career redirects back to that same page, and adjacent first-party routes such as /jobs, /join-us, /work-with-us, /openings, and /current-openings return 404. There is no trustworthy public jobs surface right now.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default AUZMOR_CATALOG
