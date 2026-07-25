import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const SARVAGRAM_CATALOG = {
  source: 'sarvagram',
  companyName: 'SarvaGram',
  officialBrandName: 'SarvaGram',
  adapter: 'script',
  homepageUrl: 'https://www.sarvagram.com/',
  companyCareerPage: 'https://www.sarvagram.com/about-us/',
  careersPortalUrl: 'https://sarvagram.zohorecruit.in/jobs/Careers',
  careersApiUrl: 'https://sarvagram.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  careersDetailHost: 'sarvagram.zohorecruit.in',
  companyDomain: 'sarvagram.com',
  atsPlatform: 'zohorecruit',
  countryFilter: 'India',
  paginationStrategy: 'official-about-page-handoff-plus-public-zoho-api',
  extractionStrategy: 'verified-about-page+official-careers-handoff+public-zohorecruit-api+detail-page-check',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-17',
  verifiedSurfaceSummary:
    'Verified on Friday, July 17, 2026 that https://www.sarvagram.com/about-us/ is the live official SarvaGram page exposing a first-party careers handoff to https://sarvagram.zohorecruit.in/jobs/Careers. Verified that the public Zoho Recruit API at https://sarvagram.zohorecruit.in/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite backs live India postings, including Platform architect - Cloud native and Senior Mobile Engineer - Flutter on the public SarvaGram board.',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'sarvagram/jobs.json',
}

export default SARVAGRAM_CATALOG
