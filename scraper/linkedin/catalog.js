import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LINKEDIN_CATALOG = {
  source: 'linkedin',
  companyName: 'LinkedIn',
  officialBrandName: 'LinkedIn',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.linkedin.com/jobs/search/?f_C=1337&geoId=102713980',
  homepageUrl: 'https://www.linkedin.com/',
  verifiedRoleUrls: [
    'https://in.linkedin.com/jobs/view/account-manager-linkedin-talent-solutions-at-linkedin-4422287519',
    'https://in.linkedin.com/jobs/view/senior-sales-manager-linkedin-marketing-solutions-at-linkedin-4419298054',
  ],
  companyDomain: 'linkedin.com',
  atsPlatform: 'linkedin-public-jobs-search',
  countryFilter: 'India',
  paginationStrategy: 'single-public-company-filtered-jobs-search-plus-public-detail-pages',
  extractionStrategy: 'verified-linkedin-public-jobs-search+company-filtered-listing-cards+public-jobposting-jsonld-detail-pages',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  dryRunFile: 'linkedin/jobs.json',
  verifiedOn: '2026-07-16',
  verifiedSurfaceSummary:
    'Verified on Thursday, July 16, 2026 that the current trustworthy first-party LinkedIn jobs surface for the exact company name is the public LinkedIn guest jobs search at https://www.linkedin.com/jobs/search/?f_C=1337&geoId=102713980, which exposed 39 jobs in India and company-filtered public role cards for LinkedIn. Verified public detail pages for Account Manager, LinkedIn Talent Solutions and Senior Sales Manager, LinkedIn Marketing Solutions expose JobPosting JSON-LD plus public role content on the same first-party linkedin.com surface.',
}

export default LINKEDIN_CATALOG
