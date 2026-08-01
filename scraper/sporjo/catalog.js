import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "sporjo",
  "companyName": "Sporjo",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.sporjo.com/",
  "atsPlatform": "verified-exact-name-public-surface-fail-closed-sentinel",
  "paginationStrategy": "single-public-company-surface",
  "extractionStrategy": "verified-exact-name-public-surface+no-public-listings-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.sporjo.com/ was the live Sporjo exact-name public company surface and that it exposed no trustworthy public careers inventory, ATS board, or JobPosting markup. This provider stays fail-closed and throws if a real public listings surface appears.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-surface-fail-closed-sentinel",
  "originalModulePath": "../workbookbatch05/sporjo.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
