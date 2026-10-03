import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "wingify",
  "companyName": "Wingify",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-first-party-careers-page-plus-public-keka-jobs-api",
  "companyCareerPage": "https://wingify.com/company/careers/",
  "companyDomain": "wingify.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-api",
  "extractionStrategy": "verified-first-party-careers-handoff+public-keka-jobs-api+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-10-03",
  "verificationDisposition": "verified-public-keka-jobs-api",
  "verifiedPublicJobCount": 23,
  "verifiedIndiaJobCount": 19,
  "verifiedSurfaceSummary": "Verified on October 3, 2026 that https://wingify.com/company/careers/ links to the Wingify Keka board and exposes https://wingify.com/wp-json/api/get-active-jobs. Both feeds listed the same 23 job IDs; the scraper cross-checks them and returns India jobs from the Keka API.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-keka-jobs-api",
  "originalModulePath": "../workbookbatch06/wingify.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\wingify.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
