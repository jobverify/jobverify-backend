import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on July 15, 2026 that https://www.dishtv.in/ is the live first-party DishTV homepage, that its footer links Careers to https://www.dishtv.in/careers.html, that https://www.dishtv.in/sitemap.xml includes https://www.dishtv.in/careers.html, and that https://www.dishtv.in/careers.html exposes a visible CURRENT OPENINGS section with 13 public job cards, a public HR contact at jobs@dishd2h.com, and Apply Now handoffs to Microsoft Forms and Google Forms including https://forms.office.com/r/57DD6f1beK.'

export const DISH_TV_CATALOG = {
  source: 'dishtv',
  companyName: 'DishTV',
  officialBrandName: 'DishTV',
  adapter: 'script',
  homepageUrl: 'https://www.dishtv.in/',
  careersPageUrl: 'https://www.dishtv.in/careers.html',
  companyCareerPage: 'https://www.dishtv.in/careers.html',
  sitemapUrl: 'https://www.dishtv.in/sitemap.xml',
  jobsContactEmail: 'jobs@dishd2h.com',
  sampleApplyUrl: 'https://forms.office.com/r/57DD6f1beK',
  companyDomain: 'dishtv.in',
  atsPlatform: 'official-company-careers-inline-job-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page-inline-job-cards',
  extractionStrategy:
    'verified-homepage-footer-careers-link+verified-sitemap-careers-entry+verified-first-party-current-openings-cards+trusted-external-apply-forms',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'dishtv/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DISH_TV_CATALOG
