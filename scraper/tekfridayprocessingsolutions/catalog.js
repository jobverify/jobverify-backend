import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG = {
  source: 'tekfridayprocessingsolutions',
  companyName: 'TekFriday Processing Solutions',
  officialBrandName: 'TekFriday',
  adapter: 'script',
  homepageUrl: 'https://www.tekfriday.com/',
  companyCareerPage: 'https://www.tekfriday.com/ContactUs.html',
  companyDomain: 'tekfriday.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-contact-validation',
  extractionStrategy: 'verified-homepage-without-careers-link+verified-contact-page-without-jobs-surface+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.tekfriday.com/ was the live first-party TekFriday site describing services only, that it did not expose a public careers or jobs route, and that the first-party contact page at https://www.tekfriday.com/ContactUs.html surfaced only generic contact details such as tag@tekfriday.com and 99896 00277. No trustworthy public jobs surface was present, so this provider is fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'tekfridayprocessingsolutions/jobs.json',
}

export default TEKFRIDAY_PROCESSING_SOLUTIONS_CATALOG
