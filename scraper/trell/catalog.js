import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "trell",
  "companyName": "Trell",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://trell.co/",
  "atsPlatform": "verified-exact-name-public-surface-fail-closed-sentinel",
  "paginationStrategy": "single-public-company-surface",
  "extractionStrategy": "verified-exact-name-public-company-surface+no-public-listings-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://trell.co/ was the live Trell exact-name public company surface and that local repo evidence did not justify a stable enumerable public jobs contract. This provider stays fail-closed and throws if that verified surface starts exposing a trustworthy public jobs flow.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-surface-fail-closed-sentinel",
  "originalModulePath": "../workbookbatch05/trell.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
