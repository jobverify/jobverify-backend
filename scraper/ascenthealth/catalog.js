import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ASCENT_HEALTH_CATALOG = {
  source: 'ascenthealth',
  companyName: 'Ascent Health',
  officialBrandName: 'Ascent Health',
  legalEntityName: 'Ascent Health Solutions Inc.',
  adapter: 'script',
  companyCareerPage: 'https://www.ascenthealthcare.com/careers/',
  homepageUrl: 'https://www.ascenthealthcare.com/',
  careersPageUrl: 'https://www.ascenthealthcare.com/careers/',
  sitemapIndexUrl: 'https://www.ascenthealthcare.com/sitemap_index.xml',
  pageSitemapUrl: 'https://www.ascenthealthcare.com/page-sitemap.xml',
  sitemapCareerRouteUrls: [
    'https://www.ascenthealthcare.com/jobs/',
    'https://www.ascenthealthcare.com/job-openings/',
    'https://www.ascenthealthcare.com/careers/',
  ],
  careerAliasRouteUrls: [
    'https://www.ascenthealthcare.com/jobs/',
    'https://www.ascenthealthcare.com/job-openings/',
    'https://www.ascenthealthcare.com/careers/jobs/',
  ],
  noPublicJobRouteUrls: [
    'https://www.ascenthealthcare.com/current-openings/',
    'https://www.ascenthealthcare.com/open-positions/',
    'https://www.ascenthealthcare.com/careers/openings/',
  ],
  atsPlatform: 'official-company-careers-nonlisting',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-careers-page-plus-sitemap-and-adjacent-route-validation',
  extractionStrategy:
    'verified-homepage+verified-resume-intake-careers-page+verified-sitemap-career-routes-and-aliases-without-public-listings-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'ascenthealthcare.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.ascenthealthcare.com/ links Explore Careers to the first-party careers page at https://www.ascenthealthcare.com/careers/. That careers page currently offers only resume-intake via careers@ascent-group.com plus an upload form, while the first-party career-like sitemap routes are limited to /careers/, /jobs/, and /job-openings/ and the alias routes resolve back to the same intake page. No trustworthy public job listings surface was exposed.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default ASCENT_HEALTH_CATALOG
