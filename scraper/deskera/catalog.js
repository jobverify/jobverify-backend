import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const DESKERA_CATALOG = {
  source: 'deskera',
  companyName: 'Deskera',
  adapter: 'script',
  homepageUrl: 'https://www.deskera.com/',
  companyCareerPage: 'https://www.linkedin.com/jobs/deskera-jobs',
  linkedinCompanyPageUrl: 'https://www.linkedin.com/company/deskera/',
  companyDomain: 'deskera.com',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'homepage-plus-broken-linkedin-jobs-handoff',
  extractionStrategy:
    'verified-homepage+verified-linkedin-company-page+verified-broken-linkedin-jobs-link-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.deskera.com/ is the live official Deskera homepage, that its Careers navigation links to https://www.linkedin.com/jobs/deskera-jobs, that https://www.linkedin.com/company/deskera/ is the live public Deskera LinkedIn company page listing https://www.deskera.com as the website and Bengaluru, 560066, IN as one of the locations, and that the Careers handoff URL currently returns a 404 page. The verified public surface therefore exposes no trustworthy public jobs listing for Deskera on the verified date.',
  dryRunFile: 'deskera/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default DESKERA_CATALOG
