import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SOURCEDESKGLOBAL_CATALOG = {
  source: 'sourcedeskglobal',
  companyName: 'Sourcedesk Global',
  officialBrandName: 'Sourcedesk Global',
  adapter: 'script',
  homepageUrl: 'https://www.sourcedeskglobal.com/',
  companyCareerPage: 'https://www.sourcedeskglobal.com/job/',
  sampleJobUrl: 'https://www.sourcedeskglobal.com/job/urgent-hiring-business-development-executive-online-bidder-required/',
  atsPlatform: 'first-party-wordpress-job-archive',
  countryFilter: 'India',
  paginationStrategy: 'single-archive-page-plus-first-party-detail-pages',
  extractionStrategy: 'verified-job-archive+first-party-job-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'sourcedeskglobal.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.sourcedeskglobal.com/job/ was the live first-party Sourcedesk Global Current Opening archive and that it publicly linked to role detail pages including Urgent Hiring: Business Development Executive / Online Bidder Required and SEO Strategy Manager on the verified date.',
  dryRunFile: 'sourcedeskglobal/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default SOURCEDESKGLOBAL_CATALOG
