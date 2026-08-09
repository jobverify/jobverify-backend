import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "verygoodsecurityindia",
  "companyName": "Very Good Security India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.verygoodsecurity.com/careers",
  "atsPlatform": "verified-non-enumerable-careers-surface",
  "paginationStrategy": "single-first-party-careers-page",
  "extractionStrategy": "verified-first-party-careers-surface+non-enumerable-public-careers-page+fail-closed",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.verygoodsecurity.com/careers was the live Very Good Security careers surface and that it exposed the trusted culture-copy contract, but no trustworthy same-origin job pages, ATS embed, or JobPosting markup. This provider returns no jobs until a stable public listings surface appears.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-non-enumerable-careers-surface",
  "originalModulePath": "../workbookbatch05/verygoodsecurityindia.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
