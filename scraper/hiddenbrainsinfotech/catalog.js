import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const HIDDEN_BRAINS_INFOTECH_CATALOG = {
  source: 'hiddenbrainsinfotech',
  companyName: 'Hidden Brains InfoTech',
  officialBrandName: 'Hidden Brains Infotech Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.hiddenbrains.com/',
  companyCareerPage: 'https://www.hiddenbrains.com/careers.html',
  atsPlatform: 'official-nextjs-careers-page',
  countryFilter: 'India',
  paginationStrategy: 'single-visible-all-positions-list',
  extractionStrategy: 'verified-first-party-careers-page+visible-all-positions-job-cards',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'hiddenbrains.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://www.hiddenbrains.com/careers.html is the live first-party Hidden Brains careers page, that it renders the visible "ALL POSITIONS" list with 15 openings, and that the page shows first-party cards such as Business Development Executive, AI/ML Engineer, and Creative UI/UX Lead with APPLY NOW links targeting the on-page #InquiryJob form. The visible list also includes one non-India title explicitly marked "Onsite - Abu Dhabi", which the local scraper excludes to stay scoped to India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default HIDDEN_BRAINS_INFOTECH_CATALOG
