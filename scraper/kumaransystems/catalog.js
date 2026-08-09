import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const KUMARAN_SYSTEMS_CATALOG = {
  source: 'kumaransystems',
  companyName: 'Kumaran Systems',
  officialBrandName: 'Kumaran Systems Pvt Ltd',
  adapter: 'script',
  homepageUrl: 'https://kumaran.com/',
  companyCareerPage: 'https://kumaran.com/careers/',
  jobsApiUrl: 'https://careers.kumaran.com/recruit/v2/public/Job_Openings?pagename=Careers&source=CareerSite',
  atsPlatform: 'first-party-careers-page-with-public-zoho-recruit-api',
  countryFilter: 'India',
  paginationStrategy: 'single-api-request',
  extractionStrategy: 'verified-first-party-careers-page+public-zoho-recruit-api+india-country-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'kumaran.com',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://kumaran.com/careers/ remains the live first-party Kumaran Systems careers surface, now as a thinner branded careers shell rather than the earlier copy-heavy recruiting page, and that careers.kumaran.com still exposes a public Zoho Recruit API with India openings. The verified public feed includes current India roles such as Associate Product Manager - Interns and QA Test Lead, so this local scraper reads the public API directly after validating the first-party careers page.',
  modulePath: path.join(currentDir, 'script.js'),
}

export default KUMARAN_SYSTEMS_CATALOG
