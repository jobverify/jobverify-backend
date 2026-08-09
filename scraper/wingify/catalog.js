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
  "companyCareerPage": "https://wingify.com/careers/",
  "companyDomain": "wingify.com",
  "countryFilter": "India",
  "paginationStrategy": "verified-public-jobs-api",
  "extractionStrategy": "verified-first-party-careers-handoff+public-keka-jobs-api+india-filter",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-26",
  "verificationDisposition": "verified-public-keka-jobs-api",
  "verifiedPublicJobCount": 23,
  "verifiedIndiaJobCount": 21,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://wingify.com/careers/ was the live exact-name Wingify careers surface, that it handed applicants to the public Keka board at https://wingify.keka.com/careers/, and that https://wingify.keka.com/careers/api/jobs/default/active exposed a trustworthy public jobs inventory including India roles. This scraper validates those verified surfaces and returns India jobs only from the public Keka API.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-page-plus-public-keka-jobs-api",
  "originalModulePath": "../workbookbatch06/wingify.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\wingify.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
