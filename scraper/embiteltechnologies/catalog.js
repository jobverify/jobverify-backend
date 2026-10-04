import path from 'node:path'
import { fileURLToPath } from 'node:url'
const currentDir = path.dirname(fileURLToPath(import.meta.url))

export const EMBITEL_TECHNOLOGIES_CATALOG = {
  source: 'embiteltechnologies',
  companyName: 'Embitel Technologies',
  officialBrandName: 'Embitel Technologies India Pvt. Ltd.',
  adapter: 'script',
  homepageUrl: 'https://www.embitel.com/',
  companyCareerPage: 'https://www.embitel.com/work-with-us/',
  openingsPageUrl: 'https://www.embitel.com/cariad-india-openings',
  jobsScriptUrl: 'https://www.embitel.com/wp-content/themes/astra-child/assets/embitel/wdhub-job.js',
  jobsApiUrl: 'https://www.embitel.com/wp-admin/admin-ajax.php',
  companyDomain: 'embitel.com',
  atsPlatform: 'first-party-ajax+workday',
  countryFilter: 'India',
  paginationStrategy: 'single-public-ajax-response',
  extractionStrategy: 'verified-first-party-openings+published-ajax-client+public-workday-handoffs',
  parser: 'custom-script',
  normalizationProfile: 'engineering-default',
  verifiedOn: '2026-10-03',
  verifiedPublicOpeningCount: 359,
  verifiedSurfaceSummary: 'Verified October 3, 2026: the official Embitel Work With Us page links current first-party opening pages. The CARIAD India Jobs page publishes wdhub-job.js, which POSTs action=get_wdhub_job to the first-party admin-ajax.php endpoint. Its success:true response contains 359 posted jobs in Bangalore or Pune with descriptions and diconium.wd3.myworkdayjobs.com/Embitel_Technologies application links. The retired SenseHQ board returns HTTP 404; failures and malformed listings remain errors.',
  modulePath: path.join(currentDir, 'script.js'),
  dryRunFile: path.join(currentDir, 'jobs.json'),
}

export default EMBITEL_TECHNOLOGIES_CATALOG
