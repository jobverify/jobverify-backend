import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "truecallerindia",
  "companyName": "Truecaller India",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.truecaller.com/careers",
  "atsPlatform": "verified-public-careers-jsonld",
  "paginationStrategy": "single-verified-public-openings-surface",
  "extractionStrategy": "verified-exact-name-public-openings-surface+same-origin-jobposting-jsonld+india-filter",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.truecaller.com/careers was the live Truecaller public careers surface and that India roles remained publicly visible on that board. The batch parser only emits India JobPosting JSON-LD with a same-origin public application URL; it returns no jobs when that narrow contract is absent.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-careers-jsonld",
  "originalModulePath": "../workbookbatch05/truecallerindia.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
