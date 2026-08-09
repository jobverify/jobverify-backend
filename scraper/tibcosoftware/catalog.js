import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const TIBCO_SOFTWARE_CATALOG = {
  source: 'tibcosoftware',
  companyName: 'TIBCO Software',
  officialBrandName: 'TIBCO',
  adapter: 'script',
  homepageUrl: 'https://www.tibco.com/',
  companyCareerPage: 'https://www.tibco.com/contact-us',
  careersHubUrl: 'https://careers.cloud.com/',
  careersSearchUrl: 'https://careers.cloud.com/jobs/search',
  companyDomain: 'tibco.com',
  atsPlatform: 'official-company-careers-no-public-jobs',
  countryFilter: 'India',
  paginationStrategy: 'official-contact-page-plus-generic-multi-brand-careers-validation',
  extractionStrategy:
    'verified-official-contact-page+verified-generic-cloud-careers-handoff+no-stable-tibco-only-public-jobs-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-05',
  verifiedSurfaceSummary:
    'Verified on Wednesday, August 5, 2026 that https://www.tibco.com/contact-us is the live official TIBCO contact page and still links applicants to https://careers.cloud.com/. Verified that the linked Cloud Software Group careers hub and search page are now protected by an AWS WAF JavaScript challenge in raw HTTP responses, but browser-rendered inspection still shows a generic multi-brand careers surface with Brand filters for Citrix, Cloud Software Group Corporate, and Spotfire rather than a stable TIBCO-only public jobs endpoint. The local provider therefore continues to fail closed until TIBCO exposes a clearly linked stable public jobs surface for TIBCO roles.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'tibcosoftware/jobs.json',
}

export default TIBCO_SOFTWARE_CATALOG
