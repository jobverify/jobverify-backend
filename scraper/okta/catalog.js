import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Friday, August 7, 2026 that https://www.okta.com/en-in/company/careers/ is the live first-party Okta careers landing page, that its View open roles CTA links to the first-party jobs surface at https://www.okta.com/company/careers/job-listing/, and that the public listing page server-renders department-grouped role cards with first-party detail URLs, including current slug-based detail URLs that no longer end in numeric requisition IDs. The verified listing page exposed 337 public roles in total and 98 India roles, all in Bengaluru, India, including Senior AEM Engineer, Principal Data Platform Engineer (Bengaluru), and Senior Alliances Solution Engineering APJ.'

export const OKTA_CATALOG = {
  source: 'okta',
  companyName: 'Okta',
  officialBrandName: 'Okta',
  adapter: 'script',
  homepageUrl: 'https://www.okta.com/',
  companyCareerPage: 'https://www.okta.com/en-in/company/careers/',
  publicBoardUrl: 'https://www.okta.com/company/careers/job-listing/',
  companyDomain: 'okta.com',
  atsPlatform: 'official-first-party-drupal-job-board',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-department-job-listing-page',
  extractionStrategy:
    'verified-careers-landing+verified-first-party-drupal-job-listing+india-location-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-07',
  verifiedPublicOpeningCount: 337,
  verifiedIndiaOpeningCount: 98,
  verifiedSampleJobTitle: 'Senior AEM Engineer',
  verifiedSampleJobUrl:
    'https://www.okta.com/company/careers/business-technology/senior-aem-engineer-7629690/',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
  dryRunFile: 'okta/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default OKTA_CATALOG
