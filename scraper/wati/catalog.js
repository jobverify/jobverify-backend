import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "wati",
  "companyName": "WATI",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.wati.io/career/",
  "atsPlatform": "verified-public-careers-non-listing-surface",
  "paginationStrategy": "fail-closed-non-listing-surface",
  "extractionStrategy": "verified-exact-name-public-careers-surface+non-listing-fail-closed",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.wati.io/career/ was the live WATI public careers surface. The page is a culture, company, and hiring-process surface; no trustworthy public openings list was exposed in the current public crawl. This batch provider returns no jobs until a stable public openings surface is verified.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-public-careers-non-listing-surface",
  "originalModulePath": "../workbookbatch05/wati.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
