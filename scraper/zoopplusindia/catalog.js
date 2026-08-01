import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "zoopplusindia",
  "companyName": "ZoopPlus India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "atsPlatform": "verified-official-brand-careers-surface-fail-closed",
  "companyCareerPage": "https://www.zoop.one/career",
  "companyDomain": "zoop.one",
  "countryFilter": "India",
  "paginationStrategy": "fail-closed-sentinel",
  "extractionStrategy": "verified-official-brand-careers-surface+no-public-listings-sentinel",
  "parser": "custom-script",
  "normalizationProfile": "engineering-default",
  "verifiedOn": "2026-07-25",
  "verificationDisposition": "no-trustworthy-exact-name-public-jobs-flow-verified-locally",
  "verifiedPublicJobCount": 0,
  "verifiedIndiaJobCount": 0,
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.zoop.one/career was the live official ZOOP careers surface reviewed for workbook company ZoopPlus India. The verified first-party page exposed brand and culture sections including \"About ZOOP\", \"Why Join Us?\" and \"People at Zoop\", but no trustworthy enumerable public jobs contract was verified for ZoopPlus India, so this company-local scraper stays fail-closed and returns no jobs until ZOOP promotes a stable public openings flow.",
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-official-brand-careers-surface-fail-closed",
  "originalModulePath": "../workbookbatch06/zoopplusindia.js",
  "originalDryRunFile": "C:\\Users\\mohv\\GitHub\\jobverify_Release_26.07.04\\jobverify-backend\\scraper\\workbookbatch06\\zoopplusindia.jobs.json"
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
