import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AIRTEL_PAYMENTS_BANK_CATALOG = {
  source: 'airtelpaymentsbank',
  companyName: 'Airtel Payments Bank',
  officialBrandName: 'Airtel Payments Bank',
  adapter: 'script',
  companyCareerPage: 'https://www.airtelpayments.bank.in/',
  aboutPageUrl: 'https://www.airtelpayments.bank.in/static/about-us',
  parentCareersPage: 'https://careers.airtel.com/',
  sharedCareersBundleUrl: 'https://careers.airtel.com/static/js/main.57023176.js',
  sharedDarwinboxUrl: 'https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs',
  sharedCareersApiUrl: 'https://careersapi.airtel.com/',
  companyDomain: 'airtelpayments.bank.in',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy:
    'verified-branded-bank-pages-plus-shared-airtel-careers-shell-bundle-and-darwinbox-checks',
  extractionStrategy:
    'verified-bank-homepage+verified-bank-about-page+no-branded-careers-links+shared-airtel-careers-shell+shared-bundle-reference+shared-darwinbox-shell-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.airtelpayments.bank.in/ and https://www.airtelpayments.bank.in/static/about-us are the live branded Airtel Payments Bank first-party pages, while the only verified public Airtel careers surface that references Airtel Payments Bank is the shared parent shell at https://careers.airtel.com/, its current bundle at https://careers.airtel.com/static/js/main.57023176.js, and the shared Airtel Darwinbox handoff at https://airtel.darwinbox.in/ms/candidatev2/main/careers/allJobs. No distinct Airtel Payments Bank public jobs surface was verifiable on the bank domain or as a separate bank-specific careers route, so there is no trustworthy public jobs surface for Airtel Payments Bank itself.',
  dryRunFile: 'airtelpaymentsbank/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default AIRTEL_PAYMENTS_BANK_CATALOG
