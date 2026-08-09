import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "synup",
  "companyName": "Synup",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.synup.com/en/careers",
  "atsPlatform": "first-party-careers-page-linkedin-handoff",
  "paginationStrategy": "single-first-party-careers-page",
  "extractionStrategy": "verified-first-party-careers-page+linkedin-handoff-without-first-party-job-list+fail-closed-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.synup.com/en/careers was the live Synup public careers surface. Its SEE OPEN POSITIONS call to action handed candidates to LinkedIn rather than exposing a first-party job inventory, so this provider remains fail-closed.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "first-party-careers-page-linkedin-handoff",
  "originalModulePath": "../workbookbatch05/synup.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
