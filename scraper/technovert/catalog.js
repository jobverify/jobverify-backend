import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "technovert",
  "companyName": "Technovert",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://technovert.com/careers/",
  "atsPlatform": "verified-tezo-rebrand-keka-handoff-fail-closed",
  "paginationStrategy": "multi-page-first-party-rebrand-handoff",
  "extractionStrategy": "verified-exact-name-careers-page+tezo-rebrand-proof+trusted-keka-handoff+fail-closed",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that Technovert's exact-name careers page at https://technovert.com/careers/ used Tezo branding, that public rebrand proof remained visible at https://org.tezo.com/about-us/, and that the Tezo careers handoff at https://org.tezo.com/careers/ exposed trusted Keka-hosted job links on tezo.kekahire.com. This provider remains fail-closed unless that verified three-page handoff contract changes.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-tezo-rebrand-keka-handoff-fail-closed",
  "originalModulePath": "../workbookbatch05/technovert.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
