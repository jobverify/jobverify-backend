import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ROLLBAR_CATALOG = {
  source: 'rollbar',
  companyName: 'Rollbar',
  officialBrandName: 'Rollbar',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://rollbar.com/',
  companyCareerPage: 'https://rollbar.com/careers',
  aboutPageUrl: 'https://rollbar.com/about-us',
  jobsPageUrl: 'https://rollbar.com/jobs',
  contactPageUrl: 'https://rollbar.com/contact-us',
  homepageCareersAnchorUrl: 'https://rollbar.com/about-us#career',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'Global',
  paginationStrategy:
    'verified-homepage-footer-careers-anchor-plus-careers-and-jobs-route-validation',
  extractionStrategy:
    'verified-homepage-footer-careers-anchor+verified-careers-route-about-page-no-public-jobs-return-empty+verified-jobs-route-homepage-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'rollbar.com',
  verifiedOn: '2026-07-25',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 25, 2026 that https://rollbar.com/ was the live first-party Rollbar homepage with the hero copy "Every error. Every release." and "Under control.", that its footer Careers link targeted https://rollbar.com/about-us#career, that direct requests to https://rollbar.com/careers resolved to the first-party about page at https://rollbar.com/about-us, and that direct requests to https://rollbar.com/jobs resolved back to the homepage. The verified about page exposed culture and benefits copy including "We build what we believe in.", "Life at Rollbar.", "Benefits.", and "Join the Rollbar Team and help developers build better software faster, together." together with a Contact us call to action at https://rollbar.com/contact-us, but no trustworthy public jobs surface, ATS handoff, public openings list, or JobPosting records.',
  dryRunFile: 'rollbar/jobs.json',
}

export default ROLLBAR_CATALOG
