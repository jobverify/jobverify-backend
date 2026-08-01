import path from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = path.dirname(fileURLToPath(import.meta.url))

const PROVIDER_METADATA = {
  "source": "trigyn",
  "companyName": "Trigyn",
  "adapter": "script",
  "modulePath": path.join(currentDir, 'script.js'),
  "companyCareerPage": "https://www.trigyn.com/careers",
  "atsPlatform": "verified-first-party-careers-empty-drupal-listing-wrapper",
  "paginationStrategy": "fail-closed-empty-drupal-listing-wrapper",
  "extractionStrategy": "verified-exact-name-public-careers-surface+empty-drupal-listing-wrapper+unlinked-detail-pages-not-enumerated+fail-closed-sentinel",
  "verifiedOn": "2026-07-25",
  "verifiedSurfaceSummary": "Verified on Saturday, July 25, 2026 that https://www.trigyn.com/careers was the live Trigyn public careers surface and advertised current opportunities. Its public Drupal response exposed an empty #ajax-wrapper for both GET and an empty-filter POST, with no JobPosting data, job links, or documented enumerable listing endpoint. Although same-origin /job/ detail pages exist, they are not linked from an official listing inventory, so this provider remains fail-closed.",
  "dryRunFile": path.join(currentDir, 'jobs.json'),
  "backfillMode": "live-copy",
  "originalAdapter": "script",
  "originalAtsPlatform": "verified-first-party-careers-empty-drupal-listing-wrapper",
  "originalModulePath": "../workbookbatch05/trigyn.js",
  "originalDryRunFile": null
}

export default PROVIDER_METADATA
export { PROVIDER_METADATA }
