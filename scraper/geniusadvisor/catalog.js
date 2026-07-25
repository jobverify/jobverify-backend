import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GENIUS_ADVISOR_CATALOG = {
  source: 'geniusadvisor',
  companyName: 'Genius Advisor',
  adapter: 'script',
  companyCareerPage: 'https://www.thegeniusadvisor.in/',
  homepageUrl: 'https://www.thegeniusadvisor.in/',
  aboutUsUrl: 'https://www.thegeniusadvisor.in/about.html',
  contactUsUrl: 'https://www.thegeniusadvisor.in/contact.html',
  officialBrandName: 'The Genius Advisors',
  founderName: 'Jai M Bihani',
  businessEmail: 'hello@thegeniusadvisor.com',
  businessPhone: '+91 96862 04879',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'browser-verified-brochure-pages-plus-timeout-route-validation',
  extractionStrategy:
    'verified-first-party-homepage-about-and-contact-pages+adjacent-exact-name-careers-routes-timeout-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'thegeniusadvisor.in',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.thegeniusadvisor.in/, https://www.thegeniusadvisor.in/about.html, and https://www.thegeniusadvisor.in/contact.html were the trusted first-party The Genius Advisors brochure pages, carrying the The Genius Advisors brand plus Jai M Bihani, hello@thegeniusadvisor.com, and +91 96862 04879 contact markers. Those verified pages exposed informational navigation such as Home, Who We Are?, What We Do?, Insights, and Start a Conversation, but no trustworthy public jobs surface. Adjacent exact-name first-party careers routes such as https://www.thegeniusadvisor.in/careers, https://www.thegeniusadvisor.in/jobs, https://www.thegeniusadvisor.in/join-us, https://www.thegeniusadvisor.in/work-with-us, and https://www.thegeniusadvisor.in/openings timed out on Friday, July 17, 2026.',
  firstPartyCareerRoutes: [
    'https://www.thegeniusadvisor.in/careers',
    'https://www.thegeniusadvisor.in/jobs',
    'https://www.thegeniusadvisor.in/join-us',
    'https://www.thegeniusadvisor.in/work-with-us',
    'https://www.thegeniusadvisor.in/openings',
  ],
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default GENIUS_ADVISOR_CATALOG
