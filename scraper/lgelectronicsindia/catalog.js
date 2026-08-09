import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LG_ELECTRONICS_INDIA_CATALOG = {
  source: 'lgelectronicsindia',
  companyName: 'LG Electronics India',
  officialBrandName: 'LG Electronics India',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  dryRunFile: 'lgelectronicsindia/jobs.json',
  companyCareerPage: 'https://globalcareers.lge.com/locations/IN',
  companyDomain: 'globalcareers.lge.com',
  atsPlatform: 'official-company-site-plus-first-party-jobs-api',
  countryFilter: 'India',
  paginationStrategy: 'browser-validated-india-location-page-plus-paged-first-party-jobs-api',
  extractionStrategy:
    'browser-validated-lg-india-location-page+verified-first-party-jobs-api+india-country-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-08-02',
  verifiedSurfaceSummary:
    'Verified on Sunday, August 2, 2026 that https://globalcareers.lge.com/locations/IN is the live LG Global Careers India location page and that its browser-rendered exact-name tabs still include LG Electronics India, Noida Factory, Pune Factory, and R&D Office. The first-party jobs API at https://globalcareers.lge.com/api/job/v1/jobs/ is publicly accessible and currently exposes India openings including Thermal Design Engineer - Refrigeration Cycle Module Development in Noida and Talent Acquisition_Manager in Bengaluru, so this scraper now returns public India roles instead of a zero-job sentinel.',
}

export default LG_ELECTRONICS_INDIA_CATALOG
