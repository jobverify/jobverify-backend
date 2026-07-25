import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const AERIES_TECHNOLOGY_CATALOG = {
  source: 'aeriestechnology',
  companyName: 'Aeries Technology',
  officialBrandName: 'Aeries Technology',
  adapter: 'script',
  homepageUrl: 'https://aeriestechnology.com/',
  companyCareerPage: 'https://aeriestechnology.com/careers/',
  jobsBoardUrl: 'https://aeriestechnology.talentrecruit.com/Default.aspx',
  atsPlatform: 'talentrecruit',
  countryFilter: 'India',
  paginationStrategy: 'single-talentrecruit-public-board',
  extractionStrategy: 'verified-first-party-careers-page+talentrecruit-public-board+india-listings',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'aeriestechnology.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://aeriestechnology.com/careers/ remained the exact first-party Aeries Technology careers page, handed applicants to https://aeriestechnology.talentrecruit.com/Default.aspx, and that the public TalentRecruit board exposed listings including Technical Support Analyst, Associate Security Analyst, and Treasury Analyst in India.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default AERIES_TECHNOLOGY_CATALOG
