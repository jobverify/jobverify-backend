import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "suryoday",
  "companyName": "Suryoday",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://suryoday.bank.in/careers/",
  "atsPlatform": "verified-workline-general-openings-table",
  "paginationStrategy": "single-first-party-handoff+workline-general-openings-table",
  "extractionStrategy": "verified-first-party-careers-page+public-workline-general-openings-table+listing-row-parser",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://suryoday.bank.in/careers/ was the live Suryoday careers surface and that its \"Find the right-fit job role for you\" handoff pointed to the public Workline General Openings board at https://suryoday.workline.hr/Candidate/GeneralOpening.aspx?Flag=C. The batch parser emits rows directly from the verified Reference No. / Position / Product / Function / Location / Action table.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-workline-general-openings-table",
  "originalModulePath": "../workbookbatch05/suryoday.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
