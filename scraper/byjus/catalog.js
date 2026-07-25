import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  "Verified on July 15, 2026 that https://byjus.com/ is the live first-party BYJU'S homepage, that https://byjus.com/careers-at-byjus/ is the live first-party careers landing page, that https://byjus.com/jobs/, https://byjus.com/careers/all-openings/, and https://byjus.com/careers/all-openings/job-category/academics/ returned 404 during live checks, that https://byjus.com/careers/all-openings/job-category/tech/ redirected to the unrelated chemistry article https://byjus.com/chemistry/technetium/, that https://byjus.com/careers/all-openings/job-category/sales/ redirected to the generic application form https://byjus.com/sales-apply/ instead of a public jobs listing, and that https://byjus.com/sitemap.xml did not expose a trustworthy public jobs surface. There is no trustworthy public jobs surface on the first-party BYJU'S domain."

export const BYJUS_CATALOG = {
  source: 'byjus',
  companyName: "BYJU'S",
  officialBrandName: "BYJU'S",
  adapter: 'script',
  homepageUrl: 'https://byjus.com/',
  companyCareerPage: 'https://byjus.com/careers-at-byjus/',
  careerPageUrl: 'https://byjus.com/careers-at-byjus/',
  salesCategoryRouteUrl: 'https://byjus.com/careers/all-openings/job-category/sales/',
  salesApplyUrl: 'https://byjus.com/sales-apply/',
  misdirectedTechRouteUrl: 'https://byjus.com/careers/all-openings/job-category/tech/',
  misdirectedTechFinalUrl: 'https://byjus.com/chemistry/technetium/',
  sitemapUrl: 'https://byjus.com/sitemap.xml',
  checkedMissingRouteUrls: [
    'https://byjus.com/jobs/',
    'https://byjus.com/careers/all-openings/',
    'https://byjus.com/careers/all-openings/job-category/academics/',
  ],
  companyDomain: 'byjus.com',
  atsPlatform: 'official-company-careers-broken-routes',
  countryFilter: 'India',
  paginationStrategy: 'careers-landing-plus-broken-route-validation',
  extractionStrategy:
    'verified-homepage+verified-careers-landing+verified-404-routes+verified-misdirected-tech-route+verified-generic-sales-apply-route-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'byjus/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default BYJUS_CATALOG
