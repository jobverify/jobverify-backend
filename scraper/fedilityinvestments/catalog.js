import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const FEDILITY_INVESTMENTS_CATALOG = {
  source: 'fedilityinvestments',
  companyName: 'Fedility Investments',
  officialBrandName: 'Fidelity Investments',
  adapter: 'script',
  companyCareerPage: 'https://jobs.fidelity.com/in/jobs/',
  jobsFeedUrl: 'https://jobs.fidelity.com/in/jobs/xml/?rss=true',
  officialJobDetailExampleUrl: 'https://jobs.fidelity.com/in/jobs/2130684/principal-network-engineer/',
  atsPlatform: 'official-company-careers',
  countryFilter: 'India',
  paginationStrategy: 'single-rss-feed',
  extractionStrategy: 'verified-first-party-india-jobs-page+verified-rss-feed+deduped-multi-location-roles',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'jobs.fidelity.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that the live first-party Fidelity India public jobs page is https://jobs.fidelity.com/in/jobs/, that Fidelity publishes a same-domain public XML/RSS jobs feed at https://jobs.fidelity.com/in/jobs/xml/?rss=true with publisher "Fidelity Investments Careers", and that the public detail contract is live at https://jobs.fidelity.com/in/jobs/2130684/principal-network-engineer/ for the role "Principal Network Engineer" with Bangalore and Chennai locations.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default FEDILITY_INVESTMENTS_CATALOG
