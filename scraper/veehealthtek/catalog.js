import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const VEE_HEALTHTEK_CATALOG = {
  source: 'veehealthtek',
  companyName: 'Vee Healthtek',
  officialBrandName: 'Vee Healthtek Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.veehealthtek.com/',
  companyCareerPage: 'https://careers.veehealthtek.com/current-openings',
  companyDomain: 'careers.veehealthtek.com',
  atsPlatform: 'first-party-datatables-json',
  countryFilter: 'India',
  paginationStrategy: 'first-party-careers-pages-plus-discovered-datatables-endpoints',
  extractionStrategy: 'verified-first-party-careers-pages+jobs-json-endpoints+detail-link-extraction+india-only-filter',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://careers.veehealthtek.com/current-openings and https://careers.veehealthtek.com/current-openings/other-job-openings were the live first-party Vee Healthtek careers pages, that both pages declared public DataTables jobs endpoints under https://careers.veehealthtek.com/jobs/, and that those endpoints returned live India openings including Agentic AI Lead, AR Caller Trainee, and Experienced System Admin L2 & Tech. Support Engineer.',
  dryRunFile: 'veehealthtek/jobs.json',
  modulePath: path.join(currentDir, 'script.js'),
}

export default VEE_HEALTHTEK_CATALOG
