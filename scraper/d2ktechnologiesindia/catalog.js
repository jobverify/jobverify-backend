import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const D2K_TECHNOLOGIES_INDIA_CATALOG = {
  source: 'd2ktechnologiesindia',
  companyName: 'D2K Technologies India',
  officialBrandName: 'D2K Technologies India Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.d2ktechnologies.com/',
  companyCareerPage: 'https://www.d2ktechnologies.com/careers',
  companyDomain: 'd2ktechnologies.com',
  atsPlatform: 'official-company-site-job-cards',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-careers-page',
  extractionStrategy: 'verified-first-party-careers-page+same-page-job-cards+same-domain-apply-links',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.d2ktechnologies.com/careers was the live first-party D2K Technologies India careers page, that it publicly listed role cards such as MSBI Developer, SQL Developer, Software Developer, Business Analyst, Software Tester, Android Developer, and Python Developer, and that each card linked to a same-domain apply route on www.d2ktechnologies.com.',
  dryRunFile: 'd2ktechnologiesindia/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default D2K_TECHNOLOGIES_INDIA_CATALOG
