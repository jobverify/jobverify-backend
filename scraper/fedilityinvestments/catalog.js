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
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on August 2, 2026 that the live first-party Fidelity India public jobs page remains https://jobs.fidelity.com/in/jobs/ in browser checks, that non-browser fetches currently receive a same-domain Cloudflare "Just a moment..." interstitial there, and that Fidelity still publishes a same-domain public XML/RSS jobs feed at https://jobs.fidelity.com/in/jobs/xml/?rss=true with publisher "Fidelity Investments Careers". The current feed still exposes live India detail routes including https://jobs.fidelity.com/in/jobs/2130684/principal-network-engineer/ for "Principal Network Engineer" and https://jobs.fidelity.com/in/jobs/2133239/data-scientist/ for "Data Scientist".',
  modulePath: path.join(currentDir, 'script.js'),
}

export default FEDILITY_INVESTMENTS_CATALOG
