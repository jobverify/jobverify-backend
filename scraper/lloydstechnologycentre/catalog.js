import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const LLOYDS_TECHNOLOGY_CENTRE_CATALOG = {
  source: 'lloydstechnologycentre',
  companyName: 'Lloyds Technology Centre',
  officialBrandName: 'Lloyds Technology Centre',
  adapter: 'script',
  homepageUrl: 'https://lloydstechnologycentre.com/',
  companyCareerPage: 'https://lloydstechnologycentre.com/',
  officialWorkdayBoardUrl: 'https://lbg.wd3.myworkdayjobs.com/Lloyds_Technology_Centre',
  atsPlatform: 'official-careers-handoff-workday-maintenance',
  countryFilter: 'India',
  paginationStrategy: 'first-party-handoff-plus-live-maintenance-check',
  extractionStrategy: 'verified-first-party-careers-page+verified-workday-handoff+verified-workday-maintenance-page+return-empty',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'lloydstechnologycentre.com',
  verifiedOn: '2026-07-18',
  verifiedSurfaceSummary:
    'Verified on Saturday, July 18, 2026 that https://lloydstechnologycentre.com/ is the exact Lloyds Technology Centre careers page, that it visibly hands applicants to https://lbg.wd3.myworkdayjobs.com/Lloyds_Technology_Centre through Search and apply links, and that the linked Workday surface currently redirects to a Workday is currently unavailable planned maintenance page, so this local provider stays fail-closed until enumeration is trustworthy again.',
  modulePath: path.resolve(currentDir, 'script.js'),
}

export default LLOYDS_TECHNOLOGY_CENTRE_CATALOG
