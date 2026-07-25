import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const ESL_STEEL_CATALOG = {
  source: 'eslsteel',
  companyName: 'ESL Steel',
  officialBrandName: 'ESL Steel Limited',
  adapter: 'script',
  modulePath: path.resolve(currentDir, 'script.js'),
  officialHomepageUrl: 'https://www.eslsteel.com/',
  officialCareerLandingUrl: 'https://www.eslsteel.com/career/',
  officialJobsArchiveUrl: 'https://www.eslsteel.com/jobs/',
  companyCareerPage: 'https://www.eslsteel.com/jobs/',
  verifiedJobDetailExampleUrl: 'https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/',
  verifiedSecondJobDetailExampleUrl: 'https://www.eslsteel.com/jobs/product-head-dip/',
  atsPlatform: 'official-company-site',
  countryFilter: 'India',
  paginationStrategy: 'single-first-party-jobs-archive-html',
  extractionStrategy:
    'verified-homepage+verified-first-party-jobs-archive+first-party-job-detail-pages+onsite-apply-form',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  companyDomain: 'eslsteel.com',
  verifiedOn: '2026-07-15',
  verifiedSurfaceSummary:
    'Verified on July 15, 2026 that https://www.eslsteel.com/ is the live ESL Steel homepage, its visible Career navigation points to https://www.eslsteel.com/career/, and the same first-party domain exposes the public jobs archive at https://www.eslsteel.com/jobs/. Live detail pages such as https://www.eslsteel.com/jobs/shift-in-charge-blast-furnace/ and https://www.eslsteel.com/jobs/product-head-dip/ exposed full role text plus the on-site "Apply For This Job" form. Verified visible archive/detail roles including Shift In-charge Blast Furnace and Product Head - DIP.',
  dryRunFile: 'eslsteel/jobs.json',
}

export default ESL_STEEL_CATALOG
