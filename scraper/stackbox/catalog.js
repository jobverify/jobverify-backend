import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "stackbox",
  "companyName": "Stackbox",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.stackbox.xyz/company",
  "atsPlatform": "verified-exact-name-public-company-surface",
  "paginationStrategy": "single-public-company-surface",
  "extractionStrategy": "verified-exact-name-public-company-surface+no-public-listings-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.stackbox.xyz/company was the live Stackbox exact-name public company surface and that it exposed no trustworthy public careers or jobs inventory. This provider stays fail-closed and throws if same-origin job routes, trusted ATS embeds, or JobPosting markup appear on that verified page.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-exact-name-public-company-surface",
  "originalModulePath": "../workbookbatch05/stackbox.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
