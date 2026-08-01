import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "urbanpiper",
  "companyName": "UrbanPiper",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.urbanpiper.com/careers",
  "atsPlatform": "verified-browse-all-jobs-handoff-sentinel",
  "paginationStrategy": "single-first-party-careers-page",
  "extractionStrategy": "verified-first-party-careers-page+browse-all-jobs-handoff-without-first-party-openings+drift-throwing-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified fixture coverage for UrbanPiper expects a first-party careers page at https://www.urbanpiper.com/careers with the \"Browse all jobs\" handoff and no trustworthy first-party listings surface. On Saturday, July 25, 2026, live re-checks were already returning HTTP 404 for that URL, so this provider stays a guarded sentinel that returns no jobs only on the verified fixture contract and throws when the public surface drifts.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-browse-all-jobs-handoff-sentinel",
  "originalModulePath": "../workbookbatch05/urbanpiper.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
