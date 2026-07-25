import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TRAK_N_TELL_CATALOG = {
  source: 'trakntell',
  companyName: 'Trak N Tell',
  officialBrandName: 'Trak N Tell',
  adapter: 'script',
  homepageUrl: 'https://www.trakntell.com/',
  companyCareerPage: 'https://www.trakntell.com/',
  contactPageUrl: 'https://www.trakntell.com/contact-us/',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-homepage-plus-product-contact-page-without-public-jobs-skip',
  extractionStrategy:
    'verified-first-party-homepage+verified-contact-page-without-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'trakntell.com',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.trakntell.com/ was a live first-party Trak N Tell product surface showing GPS Vehicle Tracker, TRAK N TELL MOBILE APP, and Need Support? links, that https://www.trakntell.com/contact-us/ was a first-party product enquiry page exposing care@trakntell.com and Select product messaging, and that no trustworthy public jobs surface was visible on or clearly linked from those first-party pages.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default TRAK_N_TELL_CATALOG
