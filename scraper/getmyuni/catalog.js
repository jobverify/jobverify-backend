import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const GET_MY_UNI_CATALOG = {
  source: 'getmyuni',
  companyName: 'GetMyUni',
  officialBrandName: 'GetMyUni',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  companyCareerPage: 'https://www.getmyuni.com/contact-us',
  officialHomepageUrl: 'https://www.getmyuni.com/',
  contactUsUrl: 'https://www.getmyuni.com/contact-us',
  informationalCareersUrl: 'https://www.getmyuni.com/careers',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'verified-homepage-plus-contact-us-plus-informational-careers-return-empty',
  extractionStrategy:
    'verified-brand-homepage+verified-work-with-us-contact-page+verified-informational-careers-page-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'getmyuni.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.getmyuni.com/ remains the live GetMyUni homepage, that https://www.getmyuni.com/contact-us says "Want to work with us? contact@getmyuni.com", and that https://www.getmyuni.com/careers is informational career-guidance content rather than a public jobs board, so there is no trustworthy public jobs surface on the first-party GetMyUni domain.',
  dryRunFile: 'getmyuni/jobs.json',
}

export default GET_MY_UNI_CATALOG
