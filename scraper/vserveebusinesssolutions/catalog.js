import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VSERVE_EBUSINESS_SOLUTIONS_CATALOG = {
  source: 'vserveebusinesssolutions',
  companyName: 'Vserve Ebusiness Solutions',
  officialBrandName: 'Vserve eBusiness Solutions',
  adapter: 'script',
  homepageUrl: 'https://vservesolution.com/',
  companyCareerPage: 'https://vservesolution.com/',
  companyDomain: 'vservesolution.com',
  atsPlatform: 'first-party-homepage-job-inquiry-email',
  countryFilter: 'India',
  paginationStrategy: 'homepage-contact-section-only',
  extractionStrategy:
    'verified-homepage+job-inquiry-email+no-public-openings-surface+fail-closed-sentinel',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://vservesolution.com/ is the live Vserve eBusiness Solutions homepage, that its contact section lists 99 Wall Street #625 plus the dedicated jobopenings@vservesolution.com inbox for job inquiries, and that the exact-name public surface exposes no public careers page or openings list. This local provider therefore remains fail-closed until Vserve publishes a trustworthy job inventory.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'vserveebusinesssolutions/jobs.json',
}

export default VSERVE_EBUSINESS_SOLUTIONS_CATALOG
