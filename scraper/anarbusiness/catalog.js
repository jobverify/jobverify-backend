import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VERIFIED_SURFACE_SUMMARY =
  'Verified on Thursday, August 13, 2026 that https://www.anar.biz/ and the legacy career-like routes under /career, /careers, /jobs, /join-us, and /work-with-us now all redirect to https://myragems.com/, a repurposed third-party commerce site titled "Myra Gems: Buy Certified Gemstone Rings for Men & Women". No trustworthy public Anar jobs surface is currently available.'

export const ANAR_BUSINESS_CATALOG = {
  source: 'anarbusiness',
  companyName: 'Anar Business',
  officialBrandName: 'Anar',
  adapter: 'script',
  modulePath: path.join(currentDir, 'script.js'),
  companyCareerPage: 'https://www.anar.biz/',
  homepageUrl: 'https://www.anar.biz/',
  companyDomain: 'anar.biz',
  atsPlatform: 'official-company-site-no-public-careers',
  countryFilter: 'India',
  paginationStrategy: 'retired-domain-redirect-plus-common-route-validation',
  extractionStrategy: 'verified-repurposed-former-domain-redirect+verified-no-public-jobs-surface-return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedMissingCareersUrls: [
    'https://www.anar.biz/career',
    'https://www.anar.biz/careers',
    'https://www.anar.biz/jobs',
    'https://www.anar.biz/join-us',
    'https://www.anar.biz/work-with-us',
  ],
  verifiedOn: '2026-08-13',
  verifiedSurfaceSummary: VERIFIED_SURFACE_SUMMARY,
}

export default ANAR_BUSINESS_CATALOG
