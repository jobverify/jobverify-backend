import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "varthana",
  "companyName": "Varthana",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://varthana.com/student/life-at-varthana/",
  "atsPlatform": "verified-workline-general-openings-table",
  "paginationStrategy": "single-first-party-handoff+workline-general-openings-table",
  "extractionStrategy": "verified-first-party-careers-page+public-workline-general-openings-table+india-listing-rows",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://varthana.com/student/life-at-varthana/ was the live Varthana public careers surface and that its Search Jobs handoff led to the public Workline board at https://app79.workline.hr/Candidate/GeneralOpening.aspx. The batch parser emits listing rows directly from that verified General Opening table.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-workline-general-openings-table",
  "originalModulePath": "../workbookbatch05/varthana.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
