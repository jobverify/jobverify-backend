import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const QUALE_INFOTECH_CATALOG = {
  source: 'qualeinfotech',
  companyName: 'Quale Infotech',
  officialBrandName: 'Quale Infotech',
  adapter: 'script',
  homepageUrl: 'https://qualeinfotech.com/',
  companyCareerPage: 'https://qualeinfotech.com/',
  aboutPageUrl: 'https://qualeinfotech.com/about-us/',
  contactPageUrl: 'https://qualeinfotech.com/contact-us/',
  companyDomain: 'qualeinfotech.com',
  atsPlatform: 'first-party-homepage-without-public-careers-surface',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-about-plus-contact-validation',
  extractionStrategy:
    'verified-first-party-homepage+about+contact-without-public-careers-or-jobs+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://qualeinfotech.com/ remained the live exact-name Quale Infotech homepage with Generative AI marketing copy and India office contact details, while https://qualeinfotech.com/about-us/ and https://qualeinfotech.com/contact-us/ exposed only company profile and contact-form content. No public careers or jobs page was exposed on the verified first-party surfaces, so this provider stays fail-closed.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'qualeinfotech/jobs.json',
}

export default QUALE_INFOTECH_CATALOG
