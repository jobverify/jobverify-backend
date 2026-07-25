import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const RAVE_TECHNOLOGIES_CATALOG = {
  source: 'ravetechnologies',
  companyName: 'Rave Technologies',
  officialBrandName: 'Rave Technologies',
  adapter: 'script',
  homepageUrl: 'https://www.rave-tech.com/',
  companyCareerPage: 'https://www.necsws.com/careers',
  successorHomepageUrl: 'https://www.necsws.com/india',
  transitionEvidenceUrl: 'https://www.nec.com/en/press/202107/global_20210701_03.html',
  companyDomain: 'necsws.com',
  atsPlatform: 'successor-careers-js-challenge',
  countryFilter: 'India',
  paginationStrategy: 'legacy-brand-transition-plus-js-required-successor-pages',
  extractionStrategy:
    'verified-nec-brand-transition+verified-js-required-successor-pages+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that NEC\'s first-party rename announcement at https://www.nec.com/en/press/202107/global_20210701_03.html states that "Rave Technologies (India) Pvt Limited" was re-named "NEC Software Solutions India Private Limited", and that the current successor pages at https://www.necsws.com/india and https://www.necsws.com/careers both returned only the JavaScript-required gate message "Javascript is required. Please enable javascript before you are allowed to see this page." No trustworthy public jobs surface was accessible for the exact legacy brand or the fetchable successor shell on the verified date, so this provider stays fail-closed.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'ravetechnologies/jobs.json',
}

export default RAVE_TECHNOLOGIES_CATALOG
