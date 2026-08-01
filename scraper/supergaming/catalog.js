import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "supergaming",
  "companyName": "SuperGaming",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.supergaming.com/careers",
  "atsPlatform": "official-company-site-email-handoff",
  "paginationStrategy": "single-careers-page-email-handoff",
  "extractionStrategy": "verified-first-party-careers-page+email-handoff-without-public-openings+fail-closed-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.supergaming.com/careers was the exact public SuperGaming careers surface. The page had no public job listings and instead routed applicants through the \"Want in?\" email handoff at hiring@supergaming.com, so this provider returns no jobs until a verified first-party listings surface appears.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "official-company-site-email-handoff",
  "originalModulePath": "../workbookbatch05/supergaming.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
