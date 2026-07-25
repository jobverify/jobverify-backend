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
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.tibco.com/contact-us is the live official TIBCO page exposing a Careers link to https://careers.cloud.com/. Verified that the linked Cloud Software Group careers hub and its public search page are live, but they remain a generic multi-brand surface rather than a stable TIBCO-only public jobs endpoint, and the only additional TIBCO-branded public jobs listing we found was a legacy Hirebridge board that is not directly linked from the current official TIBCO site. The local provider therefore fails closed until TIBCO exposes a clearly linked stable public jobs surface for TIBCO roles.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'tibcosoftware/jobs.json',
}

export default TIBCO_SOFTWARE_CATALOG
