import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const IRIS_BUSINESS_SERVICES_CATALOG = {
  source: 'irisbusinessservices',
  companyName: 'IRIS Business Services',
  officialBrandName: 'IRIS RegTech Solutions Limited (formerly known as IRIS Business Services Limited)',
  adapter: 'script',
  homepageUrl: 'https://irisbusiness.com/',
  companyCareerPage: 'https://irisregtech.com/current-openings/',
  companyDomain: 'irisregtech.com',
  atsPlatform: 'official-careers-page-no-public-listings',
  countryFilter: 'India',
  paginationStrategy: 'verified-first-party-current-openings-page-with-email-only-intake',
  extractionStrategy: 'verified-first-party-current-openings-page+fraud-alert+cv-email-intake+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://irisregtech.com/current-openings/ was the live first-party current openings page for IRIS RegTech Solutions Limited, that it identified the brand as formerly known as IRIS Business Services Limited, and that the page instructed candidates to send CVs to recruitments@irisbusiness.com while exposing no public job cards, detail pages, or structured listings. This local provider fails closed until IRIS publishes a trustworthy public jobs contract.',
  dryRunFile: 'irisbusinessservices/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default IRIS_BUSINESS_SERVICES_CATALOG
