import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "suprdaily",
  "companyName": "Supr Daily",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.suprdaily.com/",
  "atsPlatform": "verified-exact-name-public-company-surface",
  "paginationStrategy": "single-public-company-surface",
  "extractionStrategy": "verified-exact-name-public-company-surface+no-public-listings-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.suprdaily.com/ was the live Supr Daily by Swiggy exact-name public company surface. This provider stays fail-closed and throws if the verified brand signal disappears or if trustworthy public jobs links, ATS handoffs, or JobPosting markup appear.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-company-surface",
  "originalModulePath": "../workbookbatch05/suprdaily.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
