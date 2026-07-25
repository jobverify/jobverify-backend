import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const INDWEALTH_CATALOG = {
  source: 'indwealth',
  companyName: 'INDwealth',
  officialBrandName: 'INDmoney',
  adapter: 'script',
  companyCareerPage: 'https://www.indmoney.com/about',
  officialRedirectSourceUrl: 'https://www.indwealth.in/',
  officialBrandHomepageUrl: 'https://www.indmoney.com/',
  officialAboutUrl: 'https://www.indmoney.com/about',
  linkedinCompanyJobsUrl: 'https://www.linkedin.com/company/indmoney/jobs/',
  linkedinCompanyPageUrl: 'https://in.linkedin.com/company/indmoney',
  publicLinkedInJobsUrl: 'https://in.linkedin.com/jobs/indmoney-jobs',
  atsPlatform: 'linkedin-guest-search',
  countryFilter: 'India',
  paginationStrategy: 'single-public-company-search-page',
  extractionStrategy:
    'official-brand-redirect+official-about-linkedin-handoff+public-linkedin-company-search+public-detail-jsonld',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'indmoney.com',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on July 16, 2026 that https://www.indwealth.in/ redirects to https://www.indmoney.com/, that the official INDmoney about page at https://www.indmoney.com/about contains the verified Join Our Team handoff to https://www.linkedin.com/company/indmoney/jobs/, that the public LinkedIn company search surface at https://in.linkedin.com/jobs/indmoney-jobs exposed current India roles, and that public detail pages were available for INDmoney openings including Associate Product Manager – Growth, Product Manager — US Stocks, Finance Research Analyst, Compliance Officer (Payments Vertical), and Platform Engineer-SRE. This should remain a direct provider rather than alias-only because there is no existing INDmoney provider in the shared registry yet.',
  dryRunFile: 'indwealth/jobs.json',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default INDWEALTH_CATALOG
