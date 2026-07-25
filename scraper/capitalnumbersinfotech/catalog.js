import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const CAPITAL_NUMBERS_INFOTECH_CATALOG = {
  source: 'capitalnumbersinfotech',
  companyName: 'Capital Numbers Infotech',
  officialBrandName: 'Capital Numbers',
  adapter: 'script',
  homepageUrl: 'https://www.capitalnumbers.com/',
  companyCareerPage: 'https://www.capitalnumbers.com/careers.php',
  contactEmail: 'career@capitalnumbers.com',
  companyDomain: 'capitalnumbers.com',
  atsPlatform: 'first-party-careers-page-email-resume-only',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy:
    'verified-first-party-careers-page+resume-email-handoff-without-public-openings+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.capitalnumbers.com/careers.php remained the live Capital Numbers careers page, that it prominently says Build Your Career with Capital Numbers, and that it instructs candidates to email their current resume and a cover letter to career@capitalnumbers.com. No trustworthy public role cards or detail pages were exposed on the verified first-party careers page, so this provider stays fail-closed.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: 'capitalnumbersinfotech/jobs.json',
}

export default CAPITAL_NUMBERS_INFOTECH_CATALOG
