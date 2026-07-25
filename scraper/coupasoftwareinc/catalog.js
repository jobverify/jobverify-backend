import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const COUPA_SOFTWARE_INC_CATALOG = {
  source: 'coupasoftwareinc',
  companyName: 'Coupa Software Inc',
  officialBrandName: 'Coupa',
  adapter: 'script',
  companyCareerPage: 'https://careers.coupa.com/en/jobs/',
  jobsPageUrl: 'https://careers.coupa.com/en/jobs/',
  companyDomain: 'careers.coupa.com',
  atsPlatform: 'coupa-careers-site',
  countryFilter: 'India',
  paginationStrategy: 'first-party-html-pagination',
  extractionStrategy: 'verified-first-party-jobs-page+html-job-cards+country-filtered-pagination',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.coupa.com/en/jobs/ was the live first-party Coupa jobs page, that it publicly rendered Displaying 1 to 20 of 101 matching jobs, and that the visible listings included India roles such as Manager, Software Engineering (.Net with React)(12+ years) - 11699 in Hyderabad, Lead Software Engineer - Ruby on Rails(8-12 years) - 11693 in Pune, and Lead Cloud Software Engineer - 11625 in Bangalore.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'coupasoftwareinc/jobs.json',
}

export default COUPA_SOFTWARE_INC_CATALOG
