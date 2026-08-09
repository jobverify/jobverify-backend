import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SHOPPERS_STOP_CATALOG = {
  source: 'shoppersstop',
  companyName: 'Shoppers Stop',
  officialBrandName: 'Shoppers Stop Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  homepageUrl: 'https://www.shoppersstop.com/',
  companyCareerPage: 'https://beta.shoppersstop.com/miscs/aboutus',
  officialCareersHandoffUrl: 'https://ss-people.darwinbox.in/ms/candidate/careers',
  darwinboxOrigin: 'https://ss-people.darwinbox.in',
  darwinboxCompanyId: 'main',
  companyDomain: 'shoppersstop.com',
  atsPlatform: 'darwinbox',
  countryFilter: 'India',
  paginationStrategy: 'browser-session-darwinbox-pagination',
  extractionStrategy: 'verified-first-party-about-page+darwinbox-public-candidate-api',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-27',
  verifiedSurfaceSummary:
    'Verified on Monday, July 27, 2026 that https://beta.shoppersstop.com/miscs/aboutus is the live official Shoppers Stop about page and that it currently exposes a first-party Careers link to the public Darwinbox candidate portal at https://ss-people.darwinbox.in/ms/candidate/careers. The older https://ssladmin.shoppersstop.com/aboutus surface is no longer reachable from this environment, while the Darwinbox candidate portal is live under the Shoppers Stop tenant, so the provider uses the verified first-party handoff plus Darwinbox public candidate API pagination.',
  dryRunFile: 'shoppersstop/jobs.json',
}

export default SHOPPERS_STOP_CATALOG
